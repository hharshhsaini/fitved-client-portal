import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import TrainerProfileForm from "./TrainerProfileForm";

/**
 * Blocking onboarding modal shown on the trainer dashboard when the profile is
 * missing any field required to be listed & filterable (photo, education,
 * experience, clients, gender, city, availability, languages, specializations).
 *
 * It can only be closed by completing the profile — the form validates every
 * required field before saving, and a successful save fires `onCompleted`.
 */
export default function TrainerCompleteProfileDialog({
  open, trainerId, contact, onSignOut, onCompleted,
}: {
  open: boolean;
  trainerId: string;
  contact: string | null;
  onSignOut: () => void;
  onCompleted: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-3xl gap-0 overflow-hidden p-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b bg-white px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-xl text-fv-navy">
            <AlertCircle className="h-5 w-5 text-fv-orange" /> Complete your trainer profile
          </DialogTitle>
          <DialogDescription className="text-sm">
            Fill in the required details below so clients can find you in search. You won&apos;t appear in
            the trainer directory until every required field is filled.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[78vh] overflow-y-auto px-5 pb-6 pt-4">
          <TrainerProfileForm
            trainerId={trainerId}
            contact={contact}
            onSignOut={onSignOut}
            onCompleted={onCompleted}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
