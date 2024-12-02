"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { number, z } from "zod";

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

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

// -------------------------- Customer ------------------------
export type CustomerState = {
  message?: string | null;
  error?: {
    name?: string[];
    email?: string[];
    imageUrl?: string[];
  };
};

const CustomerFormSchema = z.object({
  id: z.string(),
  name: z.string({ message: 'Please enter a name.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  imageUrl: z.string({ message: 'Please upload valid image.' }),
});

const CreateCustomer = CustomerFormSchema.omit({ id: true});

const UpdateCustomer = CustomerFormSchema.omit({ id: true});

export async function createCustomer(prevState: CustomerState, formData: FormData) {
  // Validate from fields using zod
  const validatedFields = CreateCustomer.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    imageUrl: formData.get("imageUrl"),
  });

  // If form validation fails, return errors early, Otheraise, countinue
  if (!validatedFields.success) {
     return {
      error: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Customer.'
     }
  }

  // Prepare data for insertion into the database
  const { name, email, imageUrl } = validatedFields.data;

  try {
    await sql`
        INSERT INTO customers (name, email, image_url)
        VALUES (${name}, ${email}, ${imageUrl})
      `;
  } catch (error) {
    return { message: "Database Error : Failed To Create Customer." };
  }

  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}

export async function updateCustomer(id: string, prevState: CustomerState, formData: FormData) {
  const validatedFields = UpdateCustomer.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    imageUrl: formData.get("imageUrl"),
  });

  // If form validation fails, return errors early, Otheraise, countinue
  if (!validatedFields.success) {
    return {
     error: validatedFields.error.flatten().fieldErrors,
     message: 'Missing Fields. Failed to Update Customer.'
    }
 }

 // Prepare data for insertion into the database
 const { name, email, imageUrl } = validatedFields.data;

  try {
    await sql`
            UPDATE customers
            SET name = ${name}, email = ${email}, image_url = ${imageUrl}
            WHERE id = ${id}
          `;
  } catch (error) {
    return { message: "Database Error: Failed to Update Customer." };
  }

  // Calling revalidatePath to clear the client cache and make a new server request.
  revalidatePath("/dashboard/customers");
  // Calling redirect to redirect the user to the invoice's page.
  redirect("/dashboard/customers");
}

export async function deleteCustomer(id: string) {
  try {
    await sql`DELETE FROM customers WHERE id = ${id}`;
    revalidatePath("/dashboard/customers");
    return { message: "Deleted Customer." };
  } catch (error) {
    return { message: "Database Error: Failed to Delete Customer." };
  }
}


