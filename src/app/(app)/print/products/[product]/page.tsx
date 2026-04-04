import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrintProduct } from "@/lib/print/catalog";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";

export default function PrintProductPage({ params }: { params: { product: string } }) {
  const product = getPrintProduct(params.product);
  if (!product) return notFound();

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-6 text-white bg-gradient-to-br ${product.heroClass}`}>
        <p className="text-xs uppercase tracking-wide opacity-90">Poll City Print Product</p>
        <h1 className="text-3xl font-extrabold mt-1">{product.name}</h1>
        <p className="max-w-3xl mt-2 text-sm opacity-95">{product.summary}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><h2 className="font-semibold">Product Specs</h2></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-900">Sizes</p>
              <ul className="list-disc pl-5 text-gray-600">{product.sizes.map((size) => <li key={size}>{size}</li>)}</ul>
            </div>
            <div>
              <p className="font-medium text-gray-900">Materials and Finish</p>
              <ul className="list-disc pl-5 text-gray-600">{product.materials.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
            <div>
              <p className="font-medium text-gray-900">File Requirements</p>
              <p className="text-gray-600">{product.fileRequirements}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Turnaround</h2></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-gray-700">Rush: 3 days (+40%)</p>
            <p className="text-gray-700">Standard: 7 days</p>
            <p className="text-gray-700">Economy: 14 days (-10%)</p>
            <Link href={`/print/jobs/new?product=${product.id}`}>
              <Button className="w-full">Configure and Post Job</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold">Pricing</h2></CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {product.pricing.map((row) => (
              <div key={row.label} className="rounded-lg border border-gray-200 px-3 py-2">
                <p className="text-xs text-gray-500">{row.label}</p>
                <p className="font-semibold text-gray-900">${row.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
