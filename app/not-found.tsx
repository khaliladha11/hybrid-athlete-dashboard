import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-2 py-10 text-center">
      <p className="text-lg font-semibold">Halaman tidak ditemukan</p>
      <Link href="/" className="text-sm text-accent-600 underline">
        Kembali ke profil
      </Link>
    </div>
  );
}
