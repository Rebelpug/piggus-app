import { piggusApi } from "@/client/piggusApi";
import {
  ExpenseWithDecryptedData,
  RecurringExpenseData,
  RecurringExpenseWithDecryptedData,
} from "@/types/expense";
import { User } from "@supabase/supabase-js";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

// Recurring expense service functions that bridge the old client API with piggusApi

export const apiFetchRecurringExpenses = async (
  user: User,
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  decryptWithExternalEncryptionKey: (
    encryptionKey: string,
    encryptedData: string,
  ) => Promise<any>,
): Promise<{
  success: boolean;
  data?: RecurringExpenseWithDecryptedData[];
  failedRecurringExpenses?: Array<{
    id: string;
    error: string;
  }>;
  error?: string;
}> => {
  try {
    if (!user || !decryptWithExternalEncryptionKey || !decryptWithPrivateKey) {
      console.error("User credentials are invalid");
      return {
        success: false,
        error: "User credentials are invalid",
      };
    }

    const recurringExpenses = await piggusApi.getRecurringExpenses();

    if (!recurringExpenses || recurringExpenses.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    // Decrypt recurring expenses individually to handle failures gracefully
    const decryptedRecurringExpenses = [];
    const failedRecurringExpenses = [];

    for (const recurringExpense of recurringExpenses) {
      try {
        // Decrypt the group key from the membership data
        const decryptedGroupKey = await decryptWithPrivateKey(
          recurringExpense.group_membership.encrypted_group_key,
        );
        // Ensure the decrypted key is a string (base64)
        const groupKeyString =
          typeof decryptedGroupKey === "string"
            ? decryptedGroupKey
            : JSON.stringify(decryptedGroupKey);

        // Decrypt the recurring expense data
        const decryptedData = await decryptWithExternalEncryptionKey(
          groupKeyString,
          recurringExpense.encrypted_data,
        );

        decryptedRecurringExpenses.push({
          id: recurringExpense.id,
          group_id: recurringExpense.group_id,
          data: decryptedData,
          created_at: recurringExpense.created_at,
          updated_at: recurringExpense.updated_at,
        } as RecurringExpenseWithDecryptedData);
      } catch (error: any) {
        console.error(
          `Failed to decrypt recurring expense ${recurringExpense.id}:`,
          error,
        );
        failedRecurringExpenses.push({
          id: recurringExpense.id,
          error: error.message || "Decryption failed",
        });
      }
    }

    // Log failed recurring expenses for debugging
    if (failedRecurringExpenses.length > 0) {
      console.warn(
        `${failedRecurringExpenses.length} recurring expenses failed to decrypt and were skipped`,
      );
    }

    return {
      success: true,
      data: decryptedRecurringExpenses,
      failedRecurringExpenses:
        failedRecurringExpenses.length > 0
          ? failedRecurringExpenses
          : undefined,
    };
  } catch (error: any) {
    console.error("Error fetching recurring expenses:", error);
    return {
      success: false,
      error: error.message || "Failed to load recurring expenses",
    };
  }
};

export const apiCreateRecurringExpense = async (
  user: User,
  groupId: string,
  groupKey: string,
  recurringExpenseData: RecurringExpenseData,
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  encryptWithExternalEncryptionKey: (
    encryptionKey: string,
    data: any,
  ) => Promise<string>,
): Promise<{
  success: boolean;
  data?: RecurringExpenseWithDecryptedData;
  error?: string;
}> => {
  try {
    if (!user || !groupId || !groupKey || !recurringExpenseData) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const recurringExpenseId = uuidv4();
    const encryptedData = await encryptWithExternalEncryptionKey(
      groupKey,
      recurringExpenseData,
    );

    const recurringExpense = await piggusApi.createRecurringExpense({
      recurringExpenseId,
      groupId,
      encryptedData,
    });

    return {
      success: true,
      data: {
        ...recurringExpense,
        data: recurringExpenseData,
      } as RecurringExpenseWithDecryptedData,
    };
  } catch (error: any) {
    console.error("Error creating recurring expense:", error);
    return {
      success: false,
      error: error.message || "Failed to create recurring expense",
    };
  }
};

export const apiUpdateRecurringExpense = async (
  user: User,
  groupId: string,
  groupKey: string,
  updatedRecurringExpense: RecurringExpenseWithDecryptedData,
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  encryptWithExternalEncryptionKey: (
    encryptionKey: string,
    data: any,
  ) => Promise<string>,
): Promise<{
  success: boolean;
  data?: RecurringExpenseWithDecryptedData;
  error?: string;
}> => {
  try {
    if (!user || !groupId || !groupKey || !updatedRecurringExpense) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const encryptedData = await encryptWithExternalEncryptionKey(
      groupKey,
      updatedRecurringExpense.data,
    );

    const recurringExpense = await piggusApi.updateRecurringExpense(
      updatedRecurringExpense.id,
      {
        groupId,
        encryptedData,
      },
    );

    return {
      success: true,
      data: {
        ...recurringExpense,
        data: updatedRecurringExpense.data,
      } as RecurringExpenseWithDecryptedData,
    };
  } catch (error: any) {
    console.error("Error updating recurring expense:", error);
    return {
      success: false,
      error: error.message || "Failed to update recurring expense",
    };
  }
};

export const apiDeleteRecurringExpense = async (
  user: User,
  groupId: string,
  recurringExpenseId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !groupId || !recurringExpenseId) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const result = await piggusApi.deleteRecurringExpense(recurringExpenseId, {
      groupId,
    });
    return {
      success: result.success,
    };
  } catch (error: any) {
    console.error("Error deleting recurring expense:", error);
    return {
      success: false,
      error: error.message || "Failed to delete recurring expense",
    };
  }
};

export const apiProcessRecurringExpenses = async (
  user: User,
  recurringExpenses: RecurringExpenseWithDecryptedData[],
  groupMemberships: { group_id: string; encrypted_group_key: string }[],
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  encryptWithExternalEncryptionKey: (
    encryptionKey: string,
    data: any,
  ) => Promise<string>,
): Promise<{
  success: boolean;
  generatedExpenses?: ExpenseWithDecryptedData[];
  updatedRecurring?: RecurringExpenseWithDecryptedData[];
  error?: string;
}> => {
  try {
    if (!user || !recurringExpenses || !groupMemberships) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const generatedExpenses: ExpenseWithDecryptedData[] = [];
    const updatedRecurring: RecurringExpenseWithDecryptedData[] = [];

    // Process each recurring expense to see if it needs to generate a new expense
    for (const recurringExpense of recurringExpenses) {
      try {
        const now = new Date();
        const nextDue = recurringExpense.data.next_due_date
          ? new Date(recurringExpense.data.next_due_date)
          : null;

        // Check if we need to generate a new expense based on the recurring schedule
        // Skip generation if should_generate_expenses is explicitly set to false
        if (
          nextDue &&
          now >= nextDue &&
          recurringExpense.data.should_generate_expenses !== false
        ) {
          // Find the group membership for this recurring expense
          const groupMembership = groupMemberships.find(
            (gm) => gm.group_id === recurringExpense.group_id,
          );
          if (!groupMembership) {
            console.warn(
              `No group membership found for recurring expense ${recurringExpense.id}`,
            );
            continue;
          }

          // Decrypt the group key
          const decryptedGroupKey = await decryptWithPrivateKey(
            groupMembership.encrypted_group_key,
          );
          const groupKeyString =
            typeof decryptedGroupKey === "string"
              ? decryptedGroupKey
              : JSON.stringify(decryptedGroupKey);

          // Create the new expense data
          const expenseData = {
            ...recurringExpense.data,
            generatedFrom: recurringExpense.id,
            generatedAt: now.toISOString(),
            is_recurring: false,
            date: now.toISOString(),
          };

          // Calculate next due date based on frequency
          let newNextDue = new Date(nextDue);
          switch (recurringExpense.data.interval) {
            case "daily":
              newNextDue.setDate(newNextDue.getDate() + 1);
              break;
            case "weekly":
              newNextDue.setDate(newNextDue.getDate() + 7);
              break;
            case "monthly":
              newNextDue.setMonth(newNextDue.getMonth() + 1);
              break;
            case "yearly":
              newNextDue.setFullYear(newNextDue.getFullYear() + 1);
              break;
          }

          // Update the recurring expense data
          const updatedRecurringData = {
            ...recurringExpense.data,
            lastGenerated: now.toISOString(),
            nextDue: newNextDue.toISOString(),
          };

          const expenseId = uuidv4();
          const encryptedExpenseData = await encryptWithExternalEncryptionKey(
            groupKeyString,
            expenseData,
          );
          const encryptedRecurringData = await encryptWithExternalEncryptionKey(
            groupKeyString,
            updatedRecurringData,
          );

          // Generate the expense using the piggusApi
          const result = await piggusApi.generateExpenseFromRecurring(
            recurringExpense.id,
            {
              expenseId,
              groupId: recurringExpense.group_id,
              encryptedExpenseData,
              updatedRecurringData: encryptedRecurringData,
            },
          );

          if (result.expense && result.updatedRecurring) {
            generatedExpenses.push({
              id: result.expense.id,
              group_id: result.expense.group_id,
              data: expenseData,
              created_at: result.expense.created_at,
              updated_at: result.expense.updated_at,
            });

            updatedRecurring.push({
              ...result.updatedRecurring,
              data: updatedRecurringData,
            });
          }
        }
      } catch (error: any) {
        console.error(
          `Error processing recurring expense ${recurringExpense.id}:`,
          error,
        );
        // Continue with other recurring expenses
      }
    }

    return {
      success: true,
      generatedExpenses,
      updatedRecurring,
    };
  } catch (error: any) {
    console.error("Error processing recurring expenses:", error);
    return {
      success: false,
      error: error.message || "Failed to process recurring expenses",
    };
  }
};
