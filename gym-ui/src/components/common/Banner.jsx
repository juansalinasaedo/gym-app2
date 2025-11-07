// src/components/common/Banner.jsx
export default function Banner({ children, onClose }) {
    return (
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="mt-[2px]">⚠️</div>
        <div className="leading-5">{children}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-xs underline decoration-amber-700 hover:opacity-80"
            title="Ocultar aviso"
          >
            Ocultar
          </button>
        )}
      </div>
    );
  }
  