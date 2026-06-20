import * as React from "react";

import { cn } from "@/lib/utils";

type InputOTPContextValue = {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
};

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

function InputOTP({
  value,
  onChange,
  maxLength,
  children,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  children: React.ReactNode;
  className?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <InputOTPContext.Provider value={{ value, onChange, maxLength }}>
      <div className={cn("flex items-center gap-2", className)}>{children}</div>
    </InputOTPContext.Provider>
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />;
}

function InputOTPSlot({ index }: { index: number }) {
  const context = React.useContext(InputOTPContext);

  if (!context) {
    return null;
  }

  return (
    <input
      value={context.value[index] ?? ""}
      onChange={(event) => {
        const next = context.value.split("");
        next[index] = event.target.value.slice(-1);
        context.onChange(next.join("").slice(0, context.maxLength));
      }}
      inputMode="numeric"
      maxLength={1}
      className="size-10 rounded-md border border-input bg-background text-center text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`Digit ${index + 1}`}
    />
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };
