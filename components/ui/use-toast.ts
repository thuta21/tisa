type ToastOptions = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast(options: ToastOptions) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tisa:toast", { detail: options }));
  }
}

export function useToast() {
  return { toast };
}
