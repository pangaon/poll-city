import { notFound } from "next/navigation";
import { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import PublicFormClient from "./form-client";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const form = await prisma.form.findUnique({
    where: { slug: params.slug },
    select: { title: true, description: true, primaryColour: true },
  }).catch(() => null);

  if (!form) return { title: "Form Not Found" };

  return {
    title: `${form.title} — Poll City`,
    description: form.description ?? "Submit your response",
    themeColor: form.primaryColour,
  };
}

export default async function PublicFormPage({ params }: Props) {
  const form = await prisma.form.findUnique({
    where: { slug: params.slug },
    include: {
      fields: { orderBy: { order: "asc" } },
      campaign: { select: { name: true, candidateName: true, logoUrl: true, primaryColor: true } },
    },
  }).catch(() => null);

  if (!form) notFound();
  if (!form.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <p className="text-6xl mb-4">📋</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">This form is currently closed</h1>
          <p className="text-gray-600">Check back later or contact the campaign directly.</p>
        </div>
      </div>
    );
  }

  // Check date range
  const now = new Date();
  if (form.opensAt && now < form.opensAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <p className="text-6xl mb-4">⏳</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">This form is not yet open</h1>
          <p className="text-gray-600">It opens on {form.opensAt.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}.</p>
        </div>
      </div>
    );
  }
  if (form.closesAt && now > form.closesAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">This form has closed</h1>
          <p className="text-gray-600">Submissions are no longer being accepted.</p>
        </div>
      </div>
    );
  }

  // Check submit limit
  if (form.submitLimit && form.submissionCount >= form.submitLimit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <p className="text-6xl mb-4">✅</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">This form has reached its limit</h1>
          <p className="text-gray-600">Thank you for your interest.</p>
        </div>
      </div>
    );
  }

  // Increment view count (fire and forget)
  prisma.form.update({ where: { id: form.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const formData = {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    primaryColour: form.primaryColour,
    logoUrl: form.logoUrl ?? form.campaign.logoUrl,
    campaignName: form.campaign.candidateName ?? form.campaign.name,
    successMessage: form.successMessage,
    successRedirectUrl: form.successRedirectUrl,
    allowMultiple: form.allowMultiple,
    fields: form.fields.map((f) => ({
      id: f.id,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder,
      helpText: f.helpText,
      defaultValue: f.defaultValue,
      required: f.required,
      options: f.options as { value: string; label: string }[] | null,
      width: f.width,
      content: f.content,
      showIf: f.showIf as { fieldId: string; operator: string; value: string } | null,
    })),
  };

  return <PublicFormClient form={formData} />;
}
