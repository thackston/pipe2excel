export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center" aria-label="Loading">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}
