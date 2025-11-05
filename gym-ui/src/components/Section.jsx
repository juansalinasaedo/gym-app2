// src/components/Section.jsx
export default function Section({ title, children }) {
    return (
      <div className="rounded-2xl shadow bg-white p-4 border border-gray-200 mb-5">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">{title}</h2>
        {children}
      </div>
    );
  }
  