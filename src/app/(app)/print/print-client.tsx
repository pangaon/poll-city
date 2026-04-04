"use client";
import Link from "next/link";
import { ArrowRight, Printer } from "lucide-react";
import { Button, Card, CardContent, PageHeader } from "@/components/ui";
import { PRINT_PRODUCTS } from "@/lib/print/catalog";

interface Props { campaignId: string; }

export default function PrintClient({ campaignId }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Professional Campaign Print Materials - Local Shops. Competitive Prices. Fast Turnaround."
        description="Vistaprint-level quality for Canadian campaigns with local production partners."
        actions={
          <div className="flex gap-2">
            <Link href="/print/jobs/new"><Button size="sm"><Printer className="w-4 h-4 mr-2" />New Job</Button></Link>
            <Link href="/print/shops"><Button size="sm" variant="outline">Vendor Directory</Button></Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PRINT_PRODUCTS.map((product) => (
          <Card key={product.id} className="overflow-hidden border-gray-200 hover:shadow-lg transition-shadow">
            <div className={`h-28 bg-gradient-to-br ${product.heroClass} relative`}>
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white_0,transparent_45%),radial-gradient(circle_at_80%_65%,white_0,transparent_40%)]" />
            </div>
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{product.summary}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900">Starting at {product.startingPrice}</span>
                <span className="text-xs text-gray-500">{product.turnaround}</span>
              </div>
              <Link href={`/print/products/${product.id}`}>
                <Button size="sm" className="w-full">
                  View Product <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden">{campaignId}</div>
    </div>
  );
}
