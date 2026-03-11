import React from 'react';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children, showFooter = true }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
