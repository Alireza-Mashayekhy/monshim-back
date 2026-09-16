// components/booking/LightboxModal.tsx
interface LightboxModalProps {
  image: string | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  image,
  onClose,
}) => {
  if (!image) return null;
  return (
    <div
      className="fixed inset-0 z-100 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        className="absolute top-5 right-5 text-white bg-white/20 p-2 rounded-full z-[101] hover:bg-white/30"
        onClick={onClose}
      >
        ✕
      </button>
      <div
        className="max-w-full max-h-[80vh] rounded-lg shadow-2xl z-[101]"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={image}
          alt="نمونه کار"
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );
};
