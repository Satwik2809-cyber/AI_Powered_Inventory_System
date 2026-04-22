import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";

export default function ConfirmProductDialog({
  open,
  options,
  onSelect,
  onClose,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {options.map((p: any) => (
            <Button
              key={p.product_id}
              variant="outline"
              className="w-full justify-between"
              onClick={() => onSelect(p)}
            >
              <span>{p.name}</span>
              <span className="text-sm text-gray-500">
                {Math.round(p.confidence * 100)}%
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
