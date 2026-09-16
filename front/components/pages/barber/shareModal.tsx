// components/booking/ShareModal.tsx
import { toast } from 'sonner';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  link: string;
  shopName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  link,
  shopName,
}) => {
  if (!open) return null;
  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    toast.success('لینک کپی شد');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg text-gray-800 mb-2">اشتراک‌گذاری</h3>
        <p className="text-sm text-gray-500 mb-4">
          لینک پروفایل {shopName} را کپی کنید.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={link}
            readOnly
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700"
          />
          <button
            onClick={handleCopy}
            className="bg-primary-600 text-white px-5 py-3 rounded-xl font-bold text-sm"
          >
            کپی
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-500 text-sm font-bold"
        >
          بستن
        </button>
      </div>
    </div>
  );
};
