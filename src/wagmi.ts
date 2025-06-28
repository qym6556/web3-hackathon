import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { mainnet, sepolia, polygonAmoy } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export function getConfig() {
  return createConfig({
    chains: [sepolia],
    connectors: [injected(), coinbaseWallet()],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [sepolia.id]: http(),
      // [polygonAmoy.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
