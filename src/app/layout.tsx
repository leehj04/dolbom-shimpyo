import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "돌봄쉼표",
  description: "치매 돌봄 가족을 위한 단시간 대체돌봄 매칭 & 보호자 역량강화",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
