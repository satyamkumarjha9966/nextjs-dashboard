"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { number, z } from "zod";

export type State = {
  message?: string | null;
  error?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
};

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please Select a Customer.'
  }),
  amount: z.coerce.number().gt(0, {message: 'Please enter an amount greater than $0.'}),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: 'Please select an invoice status.'
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate from fields using zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // If form validation fails, return errors early, Otheraise, countinue
  if (!validatedFields.success) {
     return {
      error: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.'
     }
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  try {
    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
  } catch (error) {
    return { message: "Database Error : Failed To Create Invoice." };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");

  // OR By this method if formData have more fields
  // const rawFormData = Object.fromEntries(formData.entries())
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // If form validation fails, return errors early, Otheraise, countinue
  if (!validatedFields.success) {
    return {
     error: validatedFields.error.flatten().fieldErrors,
     message: 'Missing Fields. Failed to Update Invoice.'
    }
 }

 // Prepare data for insertion into the database
 const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
          `;
  } catch (error) {
    return { message: "Database Error: Failed to Update Invoice." };
  }

  // Calling revalidatePath to clear the client cache and make a new server request.
  revalidatePath("/dashboard/invoices");
  // Calling redirect to redirect the user to the invoice's page.
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath("/dashboard/invoices");
    return { message: "Deleted Invoice." };
  } catch (error) {
    return { message: "Database Error: Failed to Delete Invoice." };
  }
}
