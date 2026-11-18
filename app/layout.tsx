import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Um Dia de Safra · Senior Sistemas & GAtec',
  description:
    'Jornada interativa em 3D pela Usina Horizonte — enablement comercial agro da Senior Sistemas (plataforma GAtec).',
  openGraph: {
    title: 'Um Dia de Safra · Senior Sistemas & GAtec',
    description:
      'Jornada interativa em 3D pela Usina Horizonte: do planejamento agrícola à exportação.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Um Dia de Safra · Senior Sistemas & GAtec',
    description:
      'Jornada interativa em 3D pela Usina Horizonte: do planejamento agrícola à exportação.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
