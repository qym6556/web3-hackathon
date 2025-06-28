// 添加Modal组件
export interface SignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
}

export default function SignModal({ isOpen, onClose, onApprove }: SignModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Signature Verification</h3>
        <p className="mb-6">You need to sign the message to proceed with pet adoption.</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onApprove} className="px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600">
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
