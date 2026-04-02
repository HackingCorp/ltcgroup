export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-500">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400">
            <span className="text-xl font-bold text-navy-800">LP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">LTCPay</h1>
          <p className="mt-1 text-sm text-gray-300">Payment Gateway for Africa</p>
        </div>
        {children}
      </div>
    </div>
  );
}
