"use client";

import { startTransition, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  Check,
  Plus,
  Trash2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  budgetTemplatePresets,
  cloneBudgetSetup,
} from "@/lib/budget-template";
import { createEventGraph } from "@/lib/graphql/events";
import { formatCurrency } from "@/lib/utils";

const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Category name is required."),
  plannedAmount: z.number().min(0, "Planned amount cannot be negative."),
  color: z.string().min(4),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1),
        plannedAmount: z.number().min(0),
        notes: z.string().optional(),
      }),
    )
    .optional(),
});

const memberSchema = z.object({
  email: z.string().email("Enter a valid email."),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

const eventSchema = z.object({
  name: z.string().min(3, "Event name is required."),
  description: z.string().optional(),
  date: z.string().min(1, "Event date is required."),
  venue: z.string().optional(),
  eventType: z.enum([
    "WEDDING",
    "CORPORATE",
    "BIRTHDAY",
    "CONFERENCE",
    "OTHER",
  ]),
  currency: z.enum(["USD", "LKR"]),
  totalBudget: z.number().min(1, "Budget must be greater than zero."),
  categories: z.array(categorySchema).min(1, "Add at least one category."),
  members: z.array(memberSchema),
});

type EventFormValues = z.infer<typeof eventSchema>;

type StepMeta = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

const stepMeta: StepMeta[] = [
  {
    title: "Details",
    subtitle: "Event basics",
    icon: CalendarRange,
  },
  {
    title: "Budget",
    subtitle: "Budget setup",
    icon: Wallet,
  },
  {
    title: "Team",
    subtitle: "Invite people",
    icon: Users,
  },
];

const stepFields: Record<number, Array<keyof EventFormValues>> = {
  0: ["name", "date", "eventType", "venue", "description"],
  1: ["currency", "totalBudget", "categories"],
  2: ["members"],
};

const fieldError = (message?: string) =>
  message ? <p className="text-sm text-red-600">{message}</p> : null;

const buildInitialCategory = () => ({
  id: crypto.randomUUID(),
  name: "Venue",
  plannedAmount: 0,
  color: "#1E3A5F",
  lineItems: [],
});

export function EventForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      venue: "",
      eventType: "OTHER",
      currency: "USD",
      totalBudget: 0,
      categories: [buildInitialCategory()],
      members: [],
    },
  });

  const categories = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const members = useFieldArray({
    control: form.control,
    name: "members",
  });

  const watchedCategories =
    useWatch({ control: form.control, name: "categories" }) ?? [];
  const watchedMembers =
    useWatch({ control: form.control, name: "members" }) ?? [];
  const selectedCurrency =
    useWatch({ control: form.control, name: "currency" }) ?? "USD";

  const categoryTotal = watchedCategories.reduce(
    (sum, category) =>
      sum +
      (Number.isFinite(category.plannedAmount) ? category.plannedAmount : 0),
    0,
  );
  const lineItemCount = watchedCategories.reduce(
    (sum, category) => sum + (category.lineItems?.length ?? 0),
    0,
  );
  const invitedMemberCount = watchedMembers.filter((member) =>
    member.email.trim(),
  ).length;
  const currentStepMeta = stepMeta[step];

  const goToStep = async (nextStep: number) => {
    if (nextStep <= step) {
      setStep(nextStep);
      return;
    }

    const valid = await form.trigger(stepFields[step]);

    if (!valid) {
      toast.error("Complete the required fields before moving on.");
      return;
    }

    setStep(nextStep);
  };

  const loadBudgetTemplate = (preset: (typeof budgetTemplatePresets)[number]) => {
    const template = cloneBudgetSetup(preset.setup);

    form.setValue("currency", template.currency, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("totalBudget", template.totalAmount, {
      shouldValidate: true,
      shouldDirty: true,
    });
    categories.replace(template.categories);
    toast.success(`${preset.name} template loaded.`);
  };

  const resetBudgetCategories = () => {
    categories.replace([buildInitialCategory()]);
    toast.success("Budget categories reset.");
  };

  const submit = async (status: "ACTIVE" | "DRAFT") => {
    const values = await form.trigger();

    if (!values) {
      if (form.formState.errors.name || form.formState.errors.date) {
        setStep(0);
      } else if (
        form.formState.errors.totalBudget ||
        form.formState.errors.categories
      ) {
        setStep(1);
      } else {
        setStep(2);
      }
      toast.error("Fix the highlighted fields and try again.");
      return;
    }

    const data = form.getValues();
    setIsSubmitting(true);

    startTransition(() => {
      void createEventGraph({
        name: data.name.trim(),
        description: data.description?.trim() ?? "",
        date: data.date,
        venue: data.venue?.trim() ?? "",
        eventType: data.eventType,
        status,
        budget: {
          totalAmount: Math.round(data.totalBudget * 100),
          currency: data.currency,
          categories: data.categories.map((category) => ({
            ...category,
            plannedAmount: Math.round(category.plannedAmount * 100),
            lineItems: category.lineItems?.map((lineItem) => ({
              ...lineItem,
              plannedAmount: Math.round(lineItem.plannedAmount * 100),
            })),
          })),
        },
        members: data.members,
      })
        .then((eventId) => {
          toast.success(
            status === "DRAFT"
              ? "Event draft saved."
              : "Event created successfully.",
          );
          router.push(`/events/${eventId}`);
        })
        .catch((error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to save event.",
          );
          setIsSubmitting(false);
        });
    });
  };

  return (
    <Card className="w-full border-slate-200/80 bg-white/95 p-5 md:p-8">
      <div className="w-full">
        <div className="mx-auto w-full max-w-[84rem]">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
            Create Event Flow
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 md:text-[2rem]">
            A simple setup from details to budget to team.
          </h2>
        </div>

        <div className="mt-6">
          <div className="relative px-3">
            <div className="absolute left-8 right-8 top-5 h-px bg-slate-200" />
            <div
              className="absolute left-8 top-5 h-px bg-slate-900 transition-[width] duration-300"
              style={{
                width:
                  step === 0
                    ? "0%"
                    : step === 1
                      ? "calc(50% - 2rem)"
                      : "calc(100% - 4rem)",
              }}
            />

            <div className="relative grid grid-cols-3 gap-4">
              {stepMeta.map((item, index) => {
                const Icon = item.icon;
                const isActive = index <= step;
                const isCurrent = index === step;

                return (
                  <button
                    key={item.title}
                    className="flex flex-col items-center text-center"
                    onClick={() => void goToStep(index)}
                    type="button"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                        isActive
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index < step ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <span
                      className={`mt-3 text-sm font-medium ${
                        isCurrent ? "text-slate-950" : "text-slate-600"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      {item.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-[72rem] rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-950">
            {currentStepMeta.title}
          </span>
          {" "}active.
          {" "}Budget:{" "}
          <span className="font-semibold text-slate-950">
            {formatCurrency(Math.round(categoryTotal * 100), selectedCurrency)}
          </span>
          {" "}across {watchedCategories.length} categor{watchedCategories.length === 1 ? "y" : "ies"},
          {" "}with {invitedMemberCount} invited member{invitedMemberCount === 1 ? "" : "s"}.
        </div>

        <form className="mx-auto mt-6 w-full max-w-[72rem] rounded-[1.75rem] border border-slate-200/80 bg-white p-5 md:p-6">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Step {step + 1}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              {currentStepMeta.title}
            </h3>
          </div>

          {step === 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Event Name
                </span>
                <Input
                  {...form.register("name")}
                  className="h-12 rounded-[1rem]"
                  placeholder="Annual gala"
                />
                {fieldError(form.formState.errors.name?.message)}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Event Type
                </span>
                <Select
                  {...form.register("eventType")}
                  className="h-12 rounded-[1rem]"
                >
                  <option value="WEDDING">Wedding</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="BIRTHDAY">Birthday</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="OTHER">Other</option>
                </Select>
                {fieldError(form.formState.errors.eventType?.message)}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Date</span>
                <Controller
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <DateInput
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      value={field.value}
                    />
                  )}
                />
                {fieldError(form.formState.errors.date?.message)}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Venue</span>
                <Input
                  {...form.register("venue")}
                  className="h-12 rounded-[1rem]"
                  placeholder="Downtown venue"
                />
                {fieldError(form.formState.errors.venue?.message)}
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Description
                </span>
                <Textarea
                  {...form.register("description")}
                  className="min-h-32 rounded-[1rem]"
                  placeholder="Short description of the event."
                />
                {fieldError(form.formState.errors.description?.message)}
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <section className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Budget Templates
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Load a workbook structure or start from a clean budget.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={resetBudgetCategories}>
                    Reset Categories
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {budgetTemplatePresets.map((preset) => (
                    <button
                      key={preset.id}
                      className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[var(--color-primary)]"
                      onClick={() => loadBudgetTemplate(preset)}
                      title={preset.description}
                      type="button"
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {preset.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Currency
                  </span>
                  <Select
                    {...form.register("currency")}
                    className="h-12 rounded-[1rem]"
                  >
                    <option value="USD">USD</option>
                    <option value="LKR">LKR</option>
                  </Select>
                  {fieldError(form.formState.errors.currency?.message)}
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Approved Budget ({selectedCurrency})
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...form.register("totalBudget", { valueAsNumber: true })}
                    className="h-12 rounded-[1rem]"
                  />
                  {fieldError(form.formState.errors.totalBudget?.message)}
                </label>
              </div>

              <section>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Categories
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Keep the budget simple and grouped by spend area.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      categories.append({
                        id: crypto.randomUUID(),
                        name: "",
                        plannedAmount: 0,
                        color: "#2E75B6",
                        lineItems: [],
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {categories.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-[1.25rem] border border-slate-200/80 bg-slate-50/60 p-4 md:grid-cols-[minmax(0,1.6fr)_150px_96px_auto]"
                    >
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Category
                        </span>
                        <Input
                          {...form.register(`categories.${index}.name`)}
                          className="h-12 rounded-[1rem]"
                          placeholder="Category"
                        />
                        {fieldError(
                          form.formState.errors.categories?.[index]?.name?.message,
                        )}
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Planned
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...form.register(`categories.${index}.plannedAmount`, {
                            valueAsNumber: true,
                          })}
                          className="h-12 rounded-[1rem]"
                          placeholder="0.00"
                        />
                        {fieldError(
                          form.formState.errors.categories?.[index]?.plannedAmount?.message,
                        )}
                      </label>
                      <label className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Color
                        </span>
                        <Input
                          type="color"
                          className="h-12 rounded-[1rem] p-2"
                          {...form.register(`categories.${index}.color`)}
                        />
                        {fieldError(
                          form.formState.errors.categories?.[index]?.color?.message,
                        )}
                      </label>
                      <div className="flex items-end">
                        <Button
                          className="w-full justify-center text-red-600"
                          variant="ghost"
                          onClick={() => categories.remove(index)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {fieldError(form.formState.errors.categories?.message)}
              </section>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Team</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Invite the people who should help manage this event.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => members.append({ email: "", role: "VIEWER" })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </div>

              {members.fields.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-sm text-slate-600">
                  No team members added yet.
                </div>
              ) : null}

              <div className="space-y-3">
                {members.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-[1.25rem] border border-slate-200/80 bg-slate-50/60 p-4 md:grid-cols-[minmax(0,1.6fr)_180px_auto]"
                  >
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Email
                      </span>
                      <Input
                        type="email"
                        placeholder="teammate@example.com"
                        {...form.register(`members.${index}.email`)}
                        className="h-12 rounded-[1rem]"
                      />
                      {fieldError(
                        form.formState.errors.members?.[index]?.email?.message,
                      )}
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Role
                      </span>
                      <Select
                        {...form.register(`members.${index}.role`)}
                        className="h-12 rounded-[1rem]"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </Select>
                      {fieldError(
                        form.formState.errors.members?.[index]?.role?.message,
                      )}
                    </label>
                    <div className="flex items-end">
                      <Button
                        className="w-full justify-center text-red-600"
                        variant="ghost"
                        onClick={() => members.remove(index)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {fieldError(form.formState.errors.members?.message)}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Values are entered in dollars and stored as cents for exact math. Line items: {lineItemCount}.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={step === 0}
                variant="ghost"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
              >
                Back
              </Button>
              {step < stepMeta.length - 1 ? (
                <Button onClick={() => void goToStep(step + 1)}>Next</Button>
              ) : (
                <>
                  <Button
                    disabled={isSubmitting}
                    variant="secondary"
                    onClick={() => submit("DRAFT")}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    onClick={() => submit("ACTIVE")}
                  >
                    Create Event
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </Card>
  );
}
