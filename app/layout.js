import './globals.css';

export const metadata = {
  title: 'Google Indexing Checker | Bulk URL Index Status Tool',
  description:
    'Check if your URLs are indexed on Google. Paste multiple URLs and instantly see their indexing status with our free bulk checker tool.',
  keywords: 'google index checker, bulk index checker, SEO tool, site index status',
  verification: {
    google: 'Or0uq4jmoh0xT_94efwMvOZ26cv-z7_CuJFdczh-ETQ',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
