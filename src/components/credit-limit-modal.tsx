"use client"

 import Image from "next/image"
 import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CreditLimitModalProps {
  open: boolean
  onClose: () => void
  onUpgrade?: () => void
}

export function CreditLimitModal({ open, onClose, onUpgrade }: CreditLimitModalProps) {
  const handleUpgrade = () => {
    const url = "https://buy.stripe.com/fZucN5bqf7B9a2Z4hI3sI04"
    // open in new tab as requested
    window.open(url, "_blank", "noopener,noreferrer")
    if (onUpgrade) onUpgrade()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="p-0 overflow-hidden max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Image
              src="/images/Buildables-Logo.png"
              alt="Buildables"
              width={32}
              height={32}
            />
            <div className="text-lg font-semibold">Daily limit reached</div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">You&apos;ve used today&apos;s free credits. Upgrade to keep building.</p>

          <div className="border rounded-md p-4 mb-4">
            <div className="text-2xl font-bold">$25 <span className="text-base font-medium text-muted-foreground">per month</span></div>
            <div className="text-sm text-muted-foreground">Unlimited credits / month</div>
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground mb-6 list-disc pl-5">
            {/*<li>Private projects</li>*/}
            {/*<li>User roles & permissions</li>*/}
            {/*<li>Custom domains</li>*/}
            {/*<li>Remove the Buildables badge</li>*/}
            <li>Downgrade anytime</li>
            <li>Credits rollover</li>
            <li>Unlimited software components</li>
            <li>Unlimited hardware components</li>
            <li>⭐It may take up to 24 hours to activate your subscription</li>

          </ul>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleUpgrade}>Upgrade</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreditLimitModal


