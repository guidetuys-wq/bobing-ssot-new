/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // PWA mati saat development
});

module.exports = withPWA({
  reactStrictMode: true,
  // Tambahkan config lain di sini jika perlu
});