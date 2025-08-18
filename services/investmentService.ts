import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";
import { piggusApi } from "@/client/piggusApi";
import {
  PortfolioData,
  PortfolioWithDecryptedData,
  SymbolSearchWithQuoteResult,
} from "@/types/portfolio";
import {
  InvestmentData,
  InvestmentWithDecryptedData,
  LookupSearchResult,
  InvestmentLookupResultV2,
} from "@/types/investment";
import { User } from "@supabase/supabase-js";

// Investment service functions that bridge the old client API with piggusApi

export const apiFetchPortfolios = async (
  user: User,
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  decryptWithExternalEncryptionKey: (
    encryptionKey: string,
    encryptedData: string,
  ) => Promise<any>,
): Promise<{
  success: boolean;
  data?: PortfolioWithDecryptedData[];
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

    const memberships = await piggusApi.getPortfolios();

    if (!memberships) {
      return {
        success: true,
        data: [],
      };
    }

    const decryptedPortfolios = await Promise.all(
      memberships.map(async (membership) => {
        try {
          const portfolio = membership.portfolios;
          // Decrypt the portfolio key with the user's private key
          const decryptedPortfolioKey = await decryptWithPrivateKey(
            membership.encrypted_portfolio_key,
          );
          // Ensure the decrypted key is a string (base64)
          const portfolioKeyString =
            typeof decryptedPortfolioKey === "string"
              ? decryptedPortfolioKey
              : JSON.stringify(decryptedPortfolioKey);
          // Validate that this looks like a base64 string
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(portfolioKeyString)) {
            console.error(
              "Decrypted portfolio key does not appear to be valid base64:",
              portfolioKeyString.substring(0, 50),
            );
            throw new Error("Invalid portfolio key format");
          }
          // Now decrypt the portfolio data using the decrypted portfolio key
          const decryptedPortfolioData = await decryptWithExternalEncryptionKey(
            portfolioKeyString,
            portfolio.encrypted_data,
          );

          // Get full portfolio data including investments and members
          const fullPortfolioData = await piggusApi.getPortfolio(portfolio.id);

          const decryptedInvestments = await Promise.all(
            fullPortfolioData.investments.map(async (investment) => ({
              ...investment,
              data: await decryptWithExternalEncryptionKey(
                portfolioKeyString,
                investment.encrypted_data,
              ),
            })),
          );

          // Map members with their usernames (would need to be fetched from profiles if needed)
          const membersWithProfiles = fullPortfolioData.members.map(
            (member) => ({
              ...member,
              username: member.username, // This would need to be populated from profiles if needed
            }),
          );

          return {
            id: portfolio.id,
            data: decryptedPortfolioData,
            investments: decryptedInvestments,
            members: membersWithProfiles,
            membership_status: membership.status,
            encrypted_key: portfolioKeyString,
            created_at: portfolio.created_at,
            updated_at: portfolio.updated_at,
          } as unknown as PortfolioWithDecryptedData;
        } catch (error: any) {
          console.error("Error decrypting portfolio:", error);
          throw error;
        }
      }),
    );

    return {
      success: true,
      data: decryptedPortfolios,
    };
  } catch (error: any) {
    console.error("Error fetching portfolios:", error);
    return {
      success: false,
      error: error.message || "Failed to load portfolios",
    };
  }
};

export const apiCreatePortfolio = async (
  user: User,
  username: string,
  publicKey: string,
  createEncryptionKey: () => Promise<Uint8Array<ArrayBufferLike>>,
  encryptWithExternalPublicKey: (
    publicKey: string,
    data: any,
  ) => Promise<string>,
  encryptWithExternalEncryptionKey: (
    encryptionKey: string,
    data: any,
  ) => Promise<string>,
  portfolioData: PortfolioData,
): Promise<{
  success: boolean;
  data?: PortfolioWithDecryptedData;
  error?: string;
}> => {
  try {
    if (!user || !publicKey || !username) {
      return {
        success: false,
        error: "User credentials are invalid",
      };
    }

    const portfolioId = uuidv4();
    const encryptionKey = await createEncryptionKey();

    // Convert encryption key to base64 for storage and transmission
    const encryptionKeyBase64 = Buffer.from(encryptionKey).toString("base64");

    // Encrypt the portfolio data
    const encryptedPortfolioData = await encryptWithExternalEncryptionKey(
      encryptionKeyBase64,
      portfolioData,
    );

    // Encrypt the portfolio key for the user
    const encryptedPortfolioKey = await encryptWithExternalPublicKey(
      publicKey,
      encryptionKeyBase64,
    );

    const result = await piggusApi.createPortfolio({
      portfolioId,
      encryptedData: encryptedPortfolioData,
      encryptedPortfolioKey,
    });

    // Return the created portfolio in the expected format
    return {
      success: true,
      data: {
        id: portfolioId,
        data: portfolioData,
        investments: [],
        members: [
          {
            ...result.membership,
            username,
          },
        ],
        membership_status: result.membership.status,
        encrypted_key: encryptionKeyBase64,
        created_at: result.portfolio.created_at,
        updated_at: result.portfolio.updated_at,
      } as unknown as PortfolioWithDecryptedData,
    };
  } catch (error: any) {
    console.error("Error creating portfolio:", error);
    return {
      success: false,
      error: error.message || "Failed to create portfolio",
    };
  }
};

export const apiAddInvestment = async (
  user: User,
  portfolioId: string,
  portfolioKey: string,
  investmentData: InvestmentData,
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  encryptWithExternalEncryptionKey: (
    encryptionKey: string,
    data: any,
  ) => Promise<string>,
): Promise<{
  success: boolean;
  data?: InvestmentWithDecryptedData;
  error?: string;
}> => {
  try {
    if (!user || !portfolioId || !portfolioKey || !investmentData) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const investmentId = uuidv4();
    const encryptedData = await encryptWithExternalEncryptionKey(
      portfolioKey,
      investmentData,
    );

    const investment = await piggusApi.addInvestment(portfolioId, {
      investmentId,
      encryptedData,
    });

    return {
      success: true,
      data: {
        ...investment,
        data: investmentData,
      } as InvestmentWithDecryptedData,
    };
  } catch (error: any) {
    console.error("Error adding investment:", error);
    return {
      success: false,
      error: error.message || "Failed to add investment",
    };
  }
};

export const apiUpdateInvestment = async (
  user: User,
  portfolioId: string,
  portfolioKey: string,
  updatedInvestment: InvestmentWithDecryptedData,
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  encryptWithExternalEncryptionKey: (
    encryptionKey: string,
    data: any,
  ) => Promise<string>,
): Promise<{
  success: boolean;
  data?: InvestmentWithDecryptedData;
  error?: string;
}> => {
  try {
    if (!user || !portfolioId || !portfolioKey || !updatedInvestment) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const encryptedData = await encryptWithExternalEncryptionKey(
      portfolioKey,
      updatedInvestment.data,
    );

    const investment = await piggusApi.updateInvestment(
      portfolioId,
      updatedInvestment.id,
      {
        encryptedData,
      },
    );

    return {
      success: true,
      data: {
        ...investment,
        data: updatedInvestment.data,
      } as InvestmentWithDecryptedData,
    };
  } catch (error: any) {
    console.error("Error updating investment:", error);
    return {
      success: false,
      error: error.message || "Failed to update investment",
    };
  }
};

export const apiDeleteInvestment = async (
  user: User,
  portfolioId: string,
  investmentId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !portfolioId || !investmentId) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const result = await piggusApi.deleteInvestment(portfolioId, investmentId);
    return {
      success: result.success,
    };
  } catch (error: any) {
    console.error("Error deleting investment:", error);
    return {
      success: false,
      error: error.message || "Failed to delete investment",
    };
  }
};

export const apiInviteUserToPortfolio = async (
  user: User,
  portfolioId: string,
  username: string,
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  encryptWithExternalPublicKey: (
    publicKey: string,
    data: any,
  ) => Promise<string>,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !portfolioId || !username) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    // 1. Find target user by username and get their public key
    const targetUsers = await piggusApi.searchProfiles(username, 1);
    if (!targetUsers || targetUsers.length === 0) {
      return {
        success: false,
        error: "User not found",
      };
    }
    const targetUser = targetUsers[0];

    if (!targetUser.encryption_public_key) {
      return {
        success: false,
        error: "Target user has no public key",
      };
    }

    // 2. Get the current user's portfolio membership to retrieve their encrypted portfolio key
    const portfolioMemberships = await piggusApi.getPortfolios();
    const userMembership = portfolioMemberships.find(
      (membership) =>
        membership.portfolios.id === portfolioId &&
        membership.user_id === user.id,
    );

    if (!userMembership) {
      return {
        success: false,
        error: "You are not a member of this portfolio",
      };
    }

    // 3. Decrypt the portfolio key with the current user's private key
    const portfolioKey = await decryptWithPrivateKey(
      userMembership.encrypted_portfolio_key,
    );
    const portfolioKeyString =
      typeof portfolioKey === "string"
        ? portfolioKey
        : JSON.stringify(portfolioKey);

    // Validate that this looks like a base64 string
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(portfolioKeyString)) {
      console.error(
        "Decrypted portfolio key does not appear to be valid base64:",
        portfolioKeyString.substring(0, 50),
      );
      return {
        success: false,
        error: "Invalid portfolio key format",
      };
    }

    // 4. Re-encrypt the portfolio key with the target user's public key
    const encryptedPortfolioKeyForNewUser = await encryptWithExternalPublicKey(
      targetUser.encryption_public_key,
      portfolioKeyString,
    );

    // 5. Send the invitation with the properly encrypted portfolio key
    await piggusApi.inviteToPortfolio(portfolioId, {
      username,
      encryptedPortfolioKey: encryptedPortfolioKeyForNewUser,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error inviting user to portfolio:", error);
    return {
      success: false,
      error: error.message || "Failed to invite user",
    };
  }
};

export const apiHandlePortfolioInvitation = async (
  user: User,
  portfolioId: string,
  accept: boolean,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !portfolioId) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const result = await piggusApi.handlePortfolioInvite(portfolioId, {
      accept,
    });
    return {
      success: result.success,
    };
  } catch (error: any) {
    console.error("Error handling portfolio invitation:", error);
    return {
      success: false,
      error: error.message || "Failed to handle invitation",
    };
  }
};

export const apiUpdatePortfolio = async (
  user: User,
  portfolioId: string,
  encryptedKey: string,
  portfolioData: PortfolioData,
  decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
  encryptWithExternalEncryptionKey: (
    encryptionKey: string,
    data: any,
  ) => Promise<string>,
): Promise<{
  success: boolean;
  data?: PortfolioWithDecryptedData;
  error?: string;
}> => {
  try {
    if (!user || !portfolioId || !encryptedKey || !portfolioData) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const encryptedData = await encryptWithExternalEncryptionKey(
      encryptedKey,
      portfolioData,
    );

    const updatedPortfolio = await piggusApi.updatePortfolio(portfolioId, {
      encryptedData,
    });

    return {
      success: true,
      data: {
        id: updatedPortfolio.id,
        data: portfolioData,
        investments: [],
        members: [],
        membership_status: "confirmed",
        encrypted_key: encryptedKey,
        created_at: updatedPortfolio.created_at,
        updated_at: updatedPortfolio.updated_at,
      } as unknown as PortfolioWithDecryptedData,
    };
  } catch (error: any) {
    console.error("Error updating portfolio:", error);
    return {
      success: false,
      error: error.message || "Failed to update portfolio",
    };
  }
};

export const apiRemoveUserFromPortfolio = async (
  user: User,
  portfolioId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !portfolioId || !userId) {
      return {
        success: false,
        error: "Invalid parameters",
      };
    }

    const result = await piggusApi.removePortfolioMember(portfolioId, userId);
    return {
      success: result.success,
    };
  } catch (error: any) {
    console.error("Error removing user from portfolio:", error);
    return {
      success: false,
      error: error.message || "Failed to remove user from portfolio",
    };
  }
};

export const apiSearchSymbolsWithQuotes = async (
  symbol: string,
): Promise<{
  success: boolean;
  data?: InvestmentLookupResultV2[];
  error?: string;
}> => {
  try {
    if (!symbol) {
      return {
        success: false,
        error: "Missing required parameter: symbol",
      };
    }
    const result = await piggusApi.searchSymbolsWithQuotes(symbol);
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Error searching symbols with quotes:", error);
    return {
      success: false,
      error: error.message || "Failed to search symbols with quotes",
    };
  }
};

export const apiLookupInvestmentBySymbol = async (
  symbol: string,
  exchangeMarket: string,
  type: string,
  currency: string,
): Promise<{
  success: boolean;
  data?: InvestmentLookupResultV2 | null;
  error?: string;
}> => {
  try {
    if (!symbol || !exchangeMarket) {
      return {
        success: false,
        error: "Missing required parameters: symbol, exchangeMarket",
      };
    }
    const result = await piggusApi.lookupInvestmentBySymbol(
      symbol,
      exchangeMarket,
      type,
      currency,
    );
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Error looking up investment by symbol:", error);
    return {
      success: false,
      error: error.message || "Failed to lookup investment by symbol",
    };
  }
};
