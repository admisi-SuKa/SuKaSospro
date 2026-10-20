import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const UIN_LOGO = "https://admisi.uin-suka.ac.id/img/logo_uin.png";

export const metadata: Metadata = {
  title: "Jelajah Studi UIN SUKA — Sosialisasi & Promosi",
  description: "Microsite nonresmi untuk membantu sosialisasi program studi dan jalur penerimaan UIN Sunan Kalijaga.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"
        />
        <link rel="icon" type="image/png" href={UIN_LOGO} />
        <link rel="shortcut icon" type="image/png" href={UIN_LOGO} />
        <link rel="apple-touch-icon" href={UIN_LOGO} />
      </head>
      <body>
        <div className="unofficial-bar">
          <div className="container">
            <i className="bi bi-info-circle" aria-hidden="true" />
            <span><strong>Bukan website resmi UIN Sunan Kalijaga.</strong> Website ini dibuat khusus untuk keperluan sosialisasi dan promosi. Informasi final selalu merujuk pada kanal resmi UIN dan Admisi.</span>
          </div>
        </div>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
