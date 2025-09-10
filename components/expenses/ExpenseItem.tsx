import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@ui-kitten/components";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import {
  ExpenseWithDecryptedData,
  calculateUserShare,
  getCategoryDisplayInfo,
} from "@/types/expense";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";

interface ExpenseItemProps {
  item: ExpenseWithDecryptedData & { groupName?: string };
}

export default function ExpenseItem({ item }: ExpenseItemProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { userProfile } = useProfile();
  const { t } = useLocalization();

  if (!item || !item.data) {
    return null;
  }

  const userShare = calculateUserShare(item, user?.id || "");
  const totalAmount = item.data.amount || 0;
  const isPayer = item.data.payer_user_id === user?.id;
  const isSharedExpense = item.data.participants.length > 1;

  const formatCurrency = (amount: number, currency: string = "USD") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      food: "#FF6B6B",
      transportation: "#4ECDC4",
      housing: "#45B7D1",
      utilities: "#96CEB4",
      entertainment: "#FFEAA7",
      shopping: "#DDA0DD",
      health: "#98D8C8",
      education: "#A8E6CF",
      personal: "#FFB6C1",
      travel: "#87CEEB",
      other: "#D3D3D3",
    };
    return colors[category] || colors.other;
  };

  const getCategoryInfo = (categoryId: string) => {
    const categoryInfo = getCategoryDisplayInfo(
      categoryId,
      userProfile?.profile?.budgeting?.categoryOverrides,
    );
    return categoryInfo;
  };

  return (
    <TouchableOpacity
      style={[
        styles.expenseCard,
        { backgroundColor: colors.card, shadowColor: colors.text },
      ]}
      onPress={() => {
        router.push({
          pathname: "/(protected)/expense-detail",
          params: {
            expenseId: item.id,
            groupId: item.group_id,
          },
        });
      }}
    >
      <View style={styles.expenseCardContent}>
        <View style={styles.expenseHeader}>
          <View style={styles.expenseMainInfo}>
            <View
              style={[
                styles.categoryIcon,
                {
                  backgroundColor: getCategoryColor(item.data.category) + "20",
                },
              ]}
            >
              <Text style={styles.categoryEmoji}>
                {getCategoryInfo(item.data.category).icon}
              </Text>
            </View>
            <View style={styles.expenseDetails}>
              <Text style={[styles.expenseTitle, { color: colors.text }]}>
                {item.data.name || t("expenses.unnamedExpense")}
              </Text>
              <Text style={[styles.expenseSubtitle, { color: colors.icon }]}>
                {item.groupName || t("expenses.unknownGroup")} •{" "}
                {formatDate(item.data.date)}
              </Text>
            </View>
          </View>
          <View style={styles.expenseAmount}>
            <Text style={[styles.amountText, { color: colors.text }]}>
              {formatCurrency(totalAmount, item.data.currency)}
            </Text>
            {isSharedExpense && (
              <Text style={[styles.totalAmountText, { color: colors.icon }]}>
                {t("expenses.yourShare")}:{" "}
                {formatCurrency(userShare, item.data.currency)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.expenseFooter}>
          <View style={styles.expenseCategory}>
            <Text style={[styles.categoryText, { color: colors.icon }]}>
              {(() => {
                const categoryInfo = getCategoryInfo(
                  item.data.category || "other",
                );
                return `${categoryInfo.icon} ${categoryInfo.name}${categoryInfo.isDeleted ? ` (${t("expenses.deleted")})` : ""}`;
              })()}
            </Text>
          </View>
          {isPayer && (
            <View
              style={[
                styles.payerBadge,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text style={[styles.payerText, { color: colors.primary }]}>
                {t("expenses.youPaid")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  expenseCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  expenseCardContent: {
    padding: 16,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  expenseMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  expenseSubtitle: {
    fontSize: 14,
  },
  expenseAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  totalAmountText: {
    fontSize: 12,
  },
  expenseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseCategory: {
    flex: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  payerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payerText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
