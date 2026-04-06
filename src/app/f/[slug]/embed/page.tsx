import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import PublicFormClient from "../form-client";

export default async function EmbedFormPage({ params }: { params: { slug: string } }) {
  const form = await prisma.form.findUnique({
    where: { slug: params.slug },
    include: {
      fields: { orderBy: { order: "asc" } },
      campaign: { select: { name: true, candidateName: true, logoUrl: true, primaryColor: true } },
    },
  }).catch(() => null);

  if (!form || !form.isActive) notFound();

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

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <PublicFormClient form={formData} />
      </body>
    </html>
  );
}
