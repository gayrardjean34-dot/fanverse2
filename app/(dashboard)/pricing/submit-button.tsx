'use client';

import { Button } from '@/components/ui/button';
import { useFormStatus } from 'react-dom';
import { Loader2, ArrowRight } from 'lucide-react';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold"
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          Processing...
        </>
      ) : (
        <>
          Subscribe Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
