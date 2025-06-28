// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract PetAdoption is
    FunctionsClient,
    VRFConsumerBaseV2Plus,
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage
{
    // chainlink Functions
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    uint8 private donHostedSecretsSlotID;
    uint64 private donHostedSecretsVersion;
    uint64 private functions_subscriptionId;

    string constant SOURCE =
        'if(!secrets.apiKey){throw Error("API key should be provided!");};'
        'const { ethers } = await import("npm:ethers@6.10.0");'
        "const abiCoder = ethers.AbiCoder.defaultAbiCoder();"
        "const id = args[0];"
        "const apiResponse = await Functions.makeHttpRequest({"
        "url: `https://cgnmnwkflnnwwokjksvz.supabase.co/functions/v1/getPet?id=${id}`,"
        'method:"GET",'
        'headers:{"api-key":secrets.apiKey}'
        "});"
        'if(apiResponse.error) {throw Error("Request failed");};'
        "const { data } = apiResponse;"
        'if(!data){throw Error("pet does not exist");};'
        "const complexData = {id:data.id, applicants: data.applicants};"
        'const types = ["tuple(uint256 id,address[] applicants)"];'
        "const encodedData = abiCoder.encode(types, [complexData]);"
        "return ethers.getBytes(encodedData);";

    struct ComplexData {
        uint256 id;
        address[] applicants;
    }

    uint32 constant GAS_LIMIT = 300_000;
    bytes32 constant DON_ID =
        0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;
    address constant ROUTER = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);
    event RecordPet(uint256 petId);
    // chainlink VRF
    uint256 vrf_subscriptionId;
    address vrfCoordinator = 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B;
    bytes32 s_keyHash =
        0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;
    uint32 callbackGasLimit = 2500_000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;
    mapping(uint256 => uint256) vrfRequestToPetId;

    event confirmWinner(address winner);
    // chainlink Automation
    uint256 public lastTimeStamp;
    // ERC721

    // pet adoption
    struct Pet {
        address[] applicants;
        bool isAdopted;
        address winner;
    }
    mapping(uint256 petId => Pet pet) public pets;

    constructor()
        FunctionsClient(ROUTER)
        VRFConsumerBaseV2Plus(vrfCoordinator)
        ERC721("Pet", "PET")
    {}

    // set config of chainlink Functions and VRF
    function setDonHostSecretConfig(
        uint8 _slotID,
        uint64 _version,
        uint64 _functions_sub_id,
        uint256 _vrf_sub_id
    ) public onlyOwner {
        donHostedSecretsSlotID = _slotID;
        donHostedSecretsVersion = _version;
        functions_subscriptionId = _functions_sub_id;
        vrf_subscriptionId = _vrf_sub_id;
    }

    // chainlink Functions
    /**
     * @notice Send a simple request
     * @param args List of arguments accessible from within the source code
     */
    function sendRequest(
        string[] memory args
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE);
        req.addDONHostedSecrets(
            donHostedSecretsSlotID,
            donHostedSecretsVersion
        );
        if (args.length > 0) req.setArgs(args);
        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            functions_subscriptionId,
            GAS_LIMIT,
            DON_ID
        );
        return s_lastRequestId;
    }

    /**
     * @notice Store latest result/error
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        if (err.length > 0) {
            revert("Function execution error");
        }
        s_lastResponse = response;
        s_lastError = err;
        // check the pet
        ComplexData memory decodeData = abi.decode(response, (ComplexData));
        address[] memory applicants = decodeData.applicants;
        uint256 petId = decodeData.id;
        require(applicants.length > 0, "Applicants is empty!");
        Pet storage pet = pets[petId];
        require(pet.isAdopted == false, "This pet is already adopted.");
        pets[petId] = Pet(applicants, false, address(0));

        emit RecordPet(petId);
        emit Response(requestId, s_lastResponse, s_lastError);
    }

    // TODO: just for test, need remove
    function resetPetById(uint256 petId) public onlyOwner {
        pets[petId] = Pet(new address[](0), false, address(0));
    }

    // chainlink VRF
    function applyForAdoption(
        uint256 petId,
        address[] memory _applicants
    ) public {
        require(petId != 0, "Invalid petId");
        require(_applicants.length > 0, "No applicants");
        Pet storage pet = pets[petId];
        if (_applicants.length == 1) {
            address winner = _applicants[0];
            pet.winner = winner;
            pet.isAdopted = true;
            emit confirmWinner(winner);
        } else {
            uint256 requestId = s_vrfCoordinator.requestRandomWords(
                VRFV2PlusClient.RandomWordsRequest({
                    keyHash: s_keyHash,
                    subId: vrf_subscriptionId,
                    requestConfirmations: requestConfirmations,
                    callbackGasLimit: callbackGasLimit,
                    numWords: numWords,
                    // Set nativePayment to true to pay for VRF requests with Sepolia ETH instead of LINK
                    extraArgs: VRFV2PlusClient._argsToBytes(
                        VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                    )
                })
            );
            vrfRequestToPetId[requestId] = petId;
        }
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 randomNumber = randomWords[0];
        uint256 petId = vrfRequestToPetId[requestId];
        Pet storage pet = pets[petId];
        uint256 index = (randomNumber % pet.applicants.length);
        address winner = pet.applicants[index];
        pet.winner = winner;
        pet.isAdopted = true;
        emit confirmWinner(winner);
    }

    // ERC721 - NFT
    function safeMint(
        uint256 petId,
        string memory uri
    ) public returns (uint256) {
        _safeMint(msg.sender, petId);
        _setTokenURI(petId, uri);
        return petId;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // util
    function parseInt(string memory _a) internal pure returns (uint256) {
        bytes memory bResult = bytes(_a);
        uint256 res = 0;
        for (uint256 i = 0; i < bResult.length; i++) {
            uint256 c = uint256(uint8(bResult[i]));
            if (c >= 48 && c <= 57) {
                // 检查是否为数字字符（0-9）
                res = res * 10 + (c - 48);
            } else {
                revert("Invalid petId: not a number");
            }
        }
        return res;
    }
}
