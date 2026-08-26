/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Éviter qu'un package-lock.json situé plus haut sur le poste soit pris pour racine.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
