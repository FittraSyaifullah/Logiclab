import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-6 sm:gap-8">
          {/* Left sidebar */}
          <aside className="col-span-12 md:col-span-4 lg:col-span-3">
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300 mb-4 sm:mb-6 gap-2">
              <span className="inline-block">←</span>
              <Link href="/dashboard" className="hover:underline">Back to app</Link>
            </div>

            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Account</div>
            <nav className="space-y-1 mb-6">
              <Link href="#" className="block rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Preferences</Link>
            </nav>

            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Workspace</div>
            <nav className="space-y-1">
              <Link href="#" className="block rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">General</Link>
              <Link href="/settings" className="block rounded-md px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">Billing</Link>
              <Link href="#" className="block rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Members</Link>
              <Link href="#" className="block rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Usage</Link>
              <Link href="#" className="block rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">API Keys</Link>
            </nav>
          </aside>

          {/* Main content */}
          <main className="col-span-12 md:col-span-8 lg:col-span-9 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-4 sm:mb-6">Billing</h1>

            {/* Current Plan */}
            {/*<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 sm:p-6">
                <div className="min-w-0">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Current Plan</div>
                  <div className="text-slate-900 dark:text-slate-100">
                    <span className="font-medium">Premium Plan</span>
                    <span className="ml-2 text-slate-600 dark:text-slate-300">$20/mo</span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Renews on Oct 10, 2025</div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button variant="outline" className="w-full xs:w-auto">View Plans</Button>
                  <Button variant="outline" className="w-full xs:w-auto">Cancel Plan</Button>
                </div>
              </div>
            </div> */}

            {/* Credit Balance */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6">
                <div className="min-w-0">
                  <div className="text-slate-900 dark:text-slate-100 font-medium">Credit Balance</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Your daily credits reset at <span className="font-medium text-slate-700 dark:text-slate-300">12:00 UTC</span>. If you run out of credits, you can pay-as-you-go.</div>
                </div>
                <div className="shrink-0"><Button>Buy Credits</Button></div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 p-0">
                <div className="grid grid-cols-12 gap-0">
                  <div className="col-span-12 md:col-span-7 p-4 sm:p-6">
                    <div className="rounded-xl bg-slate-900 text-white p-6">
                      <div className="text-3xl font-semibold">$23.00</div>
                      <div className="text-sm text-slate-300 mt-2">hello-8075</div>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-5 p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-slate-600 dark:text-slate-300">Gifted Credits</div>
                      <div className="text-slate-900 dark:text-slate-100">$0.00</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-slate-600 dark:text-slate-300">Monthly Credits</div>
                      <div className="text-slate-900 dark:text-slate-100">$0.00 / $20.00</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-slate-600 dark:text-slate-300">Purchased Credits</div>
                      <div className="text-slate-900 dark:text-slate-100">$23.00</div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-slate-600 dark:text-slate-300">Total Available Credits</div>
                      <div className="text-slate-900 dark:text-slate-100 font-medium">$23.00</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-recharge */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-blue-50/60 dark:bg-slate-900 mt-4 sm:mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4">
                <div className="text-slate-700 dark:text-slate-200 text-sm">
                  Auto-recharge is enabled. Add $40.00 when purchased credits falls below $10.00
                </div>
                <div className="shrink-0"><Button variant="outline">Modify</Button></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}


