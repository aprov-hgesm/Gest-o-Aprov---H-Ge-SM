import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Escalas - Aprov H Ge SM',
  description: 'Sistema completo de gestão, controle e geração automática de escalas de serviço militar.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-slate-50/50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
