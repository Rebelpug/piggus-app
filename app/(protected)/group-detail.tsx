import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Alert,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import {
  Layout,
  Text,
  Card,
  Button,
  Spinner,
  TopNavigation,
  List,
  ListItem,
  Divider,
  Input,
  Modal,
  Tab,
  TabView,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useExpense } from "@/context/ExpenseContext";
import { useAuth } from "@/context/AuthContext";
import {
  ExpenseWithDecryptedData,
  calculateGroupBalances,
  calculateUserShare,
  GroupRefund,
} from "@/types/expense";
import { Ionicons } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import ExpenseItem from "@/components/expenses/ExpenseItem";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";
import { formatDate } from "@/utils/dateUtils";
import { formatCurrency } from "@/utils/currencyUtils";

export default function GroupDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    expensesGroups,
    inviteUserToGroup,
    handleGroupInvitation,
    removeUserFromGroup,
    addRefund,
    updateRefund,
    deleteRefund,
    fetchAllExpensesForGroup,
  } = useExpense();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundFormData, setRefundFormData] = useState({
    from_user_id: "",
    to_user_id: "",
    amount: "",
    description: "",
  });
  const [editingRefund, setEditingRefund] = useState<GroupRefund | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [showLoadingAlert, setShowLoadingAlert] = useState(false);
  const { t } = useLocalization();

  const group = useMemo(() => {
    return expensesGroups.find((g) => g.id === id);
  }, [expensesGroups, id]);

  // Calculate group balances
  const groupBalances = useMemo(() => {
    if (!group) return {};
    // Filter out deleted expenses from balance calculations
    const nonDeletedExpenses = group.expenses.filter(
      (expense) => expense.data.status !== "deleted",
    );
    return calculateGroupBalances(
      nonDeletedExpenses,
      group.members,
      group.data?.refunds,
    );
  }, [group]);

  // Fetch all expenses for this group when component mounts or id changes
  useEffect(() => {
    if (id && group) {
      setShowLoadingAlert(true);
      setRefreshLoading(true);

      fetchAllExpensesForGroup(id)
        .then(() => {
          setRefreshLoading(false);
          // Keep the alert visible for a short moment to show completion
          setTimeout(() => {
            setShowLoadingAlert(false);
          }, 500);
        })
        .catch((error) => {
          console.error("Failed to fetch all expenses for group:", error);
          setRefreshLoading(false);
          setShowLoadingAlert(false);
        });
    }
  }, [id, group?.id, fetchAllExpensesForGroup]);

  const navigateBack = () => {
    router.back();
  };

  const handleAddExpense = () => {
    router.push(`/(protected)/add-expense?groupId=${group?.id}`);
  };

  const handleRefresh = async () => {
    if (!id || !group || refreshLoading) return;

    setRefreshLoading(true);
    setShowLoadingAlert(true);

    try {
      await fetchAllExpensesForGroup(id, true); // force=true to bypass cache
    } catch (error) {
      console.error("Failed to refresh expenses:", error);
    } finally {
      setRefreshLoading(false);
      // Keep the alert visible for a short moment to show success
      setTimeout(() => {
        setShowLoadingAlert(false);
      }, 500);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteUsername.trim() || !group) {
      Alert.alert(
        t("groupDetail.error"),
        t("groupDetail.enterUsernameRequired"),
      );
      return;
    }

    setInviteLoading(true);
    try {
      const result = await inviteUserToGroup(group.id, inviteUsername.trim());

      if (result.success) {
        setInviteModalVisible(false);
        setInviteUsername("");
      } else {
        Alert.alert(
          t("groupDetail.error"),
          result.error || t("groupDetail.inviteUserFailed"),
        );
      }
    } catch (error) {
      console.error("Failed to invite user to group", (error as Error).message);
      Alert.alert(t("groupDetail.error"), t("groupDetail.inviteUserFailed"));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string, username: string) => {
    if (!group) return;

    Alert.alert(
      t("groupDetail.removeMember"),
      t("groupDetail.removeMemberConfirm") +
        ` ${username} ` +
        t("groupDetail.fromGroup"),
      [
        { text: t("groupDetail.cancel"), style: "cancel" },
        {
          text: t("groupDetail.removeMember"),
          style: "destructive",
          onPress: async () => {
            try {
              const result = await removeUserFromGroup(group.id, userId);
              if (!result.success) {
                Alert.alert(
                  t("groupDetail.error"),
                  result.error || t("groupDetail.removeMemberFailed"),
                );
              }
            } catch (error) {
              console.error(
                "Failed to remove user from group",
                (error as Error).message,
              );
              Alert.alert(
                t("groupDetail.error"),
                t("groupDetail.removeMemberFailed"),
              );
            }
          },
        },
      ],
    );
  };

  const handleInvitation = async (accept: boolean) => {
    if (!group) return;

    try {
      const result = await handleGroupInvitation(group.id, accept);

      if (!result.success) {
        Alert.alert(
          t("groupDetail.error"),
          result.error || t("groupDetail.inviteUserFailed"),
        );
      }
    } catch (error) {
      console.error(
        "Failed to handle group invitation",
        (error as Error).message,
      );
      Alert.alert(t("groupDetail.error"), t("groupDetail.inviteUserFailed"));
    }
  };

  const handleRefundSubmit = async () => {
    if (
      !group ||
      !user ||
      !refundFormData.from_user_id ||
      !refundFormData.to_user_id ||
      !refundFormData.amount
    ) {
      Alert.alert(t("groupDetail.error"), t("groupDetail.fillAllFields"));
      return;
    }

    if (refundFormData.from_user_id === refundFormData.to_user_id) {
      Alert.alert(
        t("groupDetail.error"),
        "Cannot create a refund to the same person",
      );
      return;
    }

    const amount = parseFloat(refundFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t("groupDetail.error"), t("groupDetail.enterValidAmount"));
      return;
    }

    setRefundLoading(true);
    try {
      const refundData = {
        from_user_id: refundFormData.from_user_id,
        to_user_id: refundFormData.to_user_id,
        amount,
        currency: group.data?.currency || "USD",
        description: refundFormData.description,
        date: new Date().toISOString().split("T")[0],
      };

      let result;
      if (editingRefund) {
        result = await updateRefund(group.id, editingRefund.id, refundData);
      } else {
        result = await addRefund(group.id, refundData);
      }

      if (result.success) {
        setRefundModalVisible(false);
        setRefundFormData({
          from_user_id: "",
          to_user_id: "",
          amount: "",
          description: "",
        });
        setEditingRefund(null);
      } else {
        Alert.alert("Error", result.error || t("groupDetail.saveRefundFailed"));
      }
    } catch (error) {
      console.error("Failed to save refund", (error as Error).message);
      Alert.alert(t("groupDetail.error"), t("groupDetail.saveRefundFailed"));
    } finally {
      setRefundLoading(false);
    }
  };

  const handleEditRefund = (refund: GroupRefund) => {
    setEditingRefund(refund);
    setRefundFormData({
      from_user_id: refund.from_user_id,
      to_user_id: refund.to_user_id,
      amount: refund.amount.toString(),
      description: refund.description || "",
    });
    setRefundModalVisible(true);
  };

  const handleDeleteRefund = async (refundId: string) => {
    if (!group) return;

    Alert.alert(
      t("groupDetail.deleteRefund"),
      t("groupDetail.deleteRefundConfirm"),
      [
        { text: t("groupDetail.cancel"), style: "cancel" },
        {
          text: t("groupDetail.deleteRefund"),
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteRefund(group.id, refundId);
              if (!result.success) {
                Alert.alert(
                  t("groupDetail.error"),
                  result.error || t("groupDetail.deleteRefundFailed"),
                );
              }
            } catch (error) {
              Alert.alert(
                t("groupDetail.error"),
                t("groupDetail.deleteRefundFailed"),
              );
            }
          },
        },
      ],
    );
  };

  const renderExpenseItem = ({ item }: { item: ExpenseWithDecryptedData }) => {
    if (!item || !item.data) {
      return null;
    }

    // Add group name to the item for ExpenseItem component
    const itemWithGroupName = {
      ...item,
      groupName: group?.data?.name || "Unknown Group",
    };

    return <ExpenseItem item={itemWithGroupName} />;
  };

  const renderMemberItem = ({ item }: { item: any }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "confirmed":
          return "#4CAF50";
        case "pending":
          return "#FF9800";
        case "rejected":
          return "#F44336";
        default:
          return "#9E9E9E";
      }
    };

    const isCurrentUser = item.user_id === user?.id;
    const canRemove = item.status === "confirmed" && !isCurrentUser;
    const balance = groupBalances[item.user_id] || 0;
    const isPositive = balance > 0;
    const isZero = Math.abs(balance) < 0.01;

    return (
      <ListItem
        title={item.username || "Unknown User"}
        description={`Member since ${formatDate(item.created_at)}`}
        accessoryLeft={() => (
          <Layout
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
        )}
        accessoryRight={() => (
          <Layout style={styles.memberAccessory}>
            <Layout style={styles.memberInfo}>
              <Layout style={styles.memberStatus}>
                <Text
                  category="c1"
                  style={[
                    styles.memberStatusText,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {item.status}
                </Text>
                {isCurrentUser && (
                  <Text category="c1" style={styles.currentUserText}>
                    {t("groupDetail.you")}
                  </Text>
                )}
              </Layout>
              {item.status === "confirmed" && (
                <Layout style={styles.balanceInfo}>
                  <Text
                    category="s1"
                    style={[
                      styles.balanceAmount,
                      {
                        color: isZero
                          ? "#666"
                          : isPositive
                            ? "#4CAF50"
                            : "#F44336",
                      },
                    ]}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(balance, group?.data?.currency)}
                  </Text>
                  <Text
                    category="c1"
                    appearance="hint"
                    style={styles.balanceStatus}
                  >
                    {isZero
                      ? t("groupDetail.settled")
                      : isPositive
                        ? t("groupDetail.isOwed")
                        : t("groupDetail.owesAmount")}
                  </Text>
                </Layout>
              )}
            </Layout>
            {canRemove && (
              <TouchableOpacity
                onPress={() => handleRemoveUser(item.user_id, item.username)}
                style={styles.removeButton}
              >
                <Ionicons
                  name="person-remove-outline"
                  size={20}
                  color="#F44336"
                />
              </TouchableOpacity>
            )}
          </Layout>
        )}
      />
    );
  };

  // Calculate settlement suggestions
  const calculateSettlements = () => {
    const allMembers = group?.members || [];
    const balances = allMembers
      .map((member) => ({
        ...member,
        balance: groupBalances[member.user_id] || 0,
      }))
      .filter((member) => Math.abs(member.balance) > 0.01); // Only include non-zero balances

    const creditors = balances
      .filter((member) => member.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    const debtors = balances
      .filter((member) => member.balance < 0)
      .sort((a, b) => a.balance - b.balance);

    const settlements = [];
    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const amountOwed = Math.abs(debtor.balance);
      const amountToReceive = creditor.balance;
      const settlementAmount = Math.min(amountOwed, amountToReceive);

      if (settlementAmount > 0.01) {
        settlements.push({
          from: debtor,
          to: creditor,
          amount: settlementAmount,
        });

        // Update balances
        creditor.balance -= settlementAmount;
        debtor.balance += settlementAmount;
      }

      // Move to next creditor/debtor if current one is settled
      if (Math.abs(creditor.balance) < 0.01) {
        creditorIndex++;
      }
      if (Math.abs(debtor.balance) < 0.01) {
        debtorIndex++;
      }
    }

    return settlements;
  };

  const renderBalancesTab = () => {
    const settlements = calculateSettlements();
    const allMembers = group?.members || [];
    const sortedBalances = allMembers
      .map((member) => ({
        ...member,
        balance: groupBalances[member.user_id] || 0,
      }))
      .sort((a, b) => b.balance - a.balance);

    return (
      <View style={styles.tabContent}>
        <ScrollView
          style={styles.balancesScrollView}
          showsVerticalScrollIndicator={false}
        >
          <Layout style={styles.balancesHeader}>
            <Text category="h6" style={styles.balancesTitle}>
              Settlement Suggestions
            </Text>
            <Text
              category="c1"
              appearance="hint"
              style={styles.balancesSubtitle}
            >
              Who should pay whom to settle all balances
            </Text>
          </Layout>

          {settlements.length > 0 && (
            <Layout style={styles.settlementsSection}>
              <List
                style={styles.settlementsList}
                data={settlements}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const isCurrentUserPaying = item.from.user_id === user?.id;
                  const isCurrentUserReceiving = item.to.user_id === user?.id;

                  return (
                    <ListItem
                      title={`${item.from.username} → ${item.to.username}`}
                      description={
                        isCurrentUserPaying
                          ? `You need to pay ${item.to.username}`
                          : isCurrentUserReceiving
                            ? `${item.from.username} should pay you`
                            : "Settlement between members"
                      }
                      accessoryLeft={() => (
                        <Layout
                          style={[
                            styles.settlementIcon,
                            {
                              backgroundColor: isCurrentUserPaying
                                ? "#FF6B6B20"
                                : isCurrentUserReceiving
                                  ? "#4CAF5020"
                                  : "#8F9BB320",
                            },
                          ]}
                        >
                          <Ionicons
                            name="arrow-forward-outline"
                            size={20}
                            color={
                              isCurrentUserPaying
                                ? "#FF6B6B"
                                : isCurrentUserReceiving
                                  ? "#4CAF50"
                                  : "#8F9BB3"
                            }
                          />
                        </Layout>
                      )}
                      accessoryRight={() => (
                        <Layout style={styles.settlementAmount}>
                          <Text
                            category="h6"
                            style={[
                              styles.settlementAmountText,
                              {
                                color: isCurrentUserPaying
                                  ? "#FF6B6B"
                                  : isCurrentUserReceiving
                                    ? "#4CAF50"
                                    : colors.text,
                              },
                            ]}
                          >
                            {formatCurrency(item.amount, group?.data?.currency)}
                          </Text>
                          <Text
                            category="c1"
                            appearance="hint"
                            style={styles.settlementStatus}
                          >
                            {isCurrentUserPaying
                              ? "You owe"
                              : isCurrentUserReceiving
                                ? "You receive"
                                : "Transfer"}
                          </Text>
                        </Layout>
                      )}
                    />
                  );
                }}
                ItemSeparatorComponent={Divider}
              />
            </Layout>
          )}

          {sortedBalances.length > 0 ? (
            <Layout style={styles.balancesSection}>
              <Text category="s1" style={styles.sectionTitle}>
                Individual Balances
              </Text>
              <List
                style={styles.balancesList}
                data={sortedBalances}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const isCurrentUser = item.user_id === user?.id;
                  const isPositive = item.balance > 0;
                  const isZero = Math.abs(item.balance) < 0.01;
                  const isPending = item.status === "pending";

                  return (
                    <ListItem
                      title={`${item.username}${isCurrentUser ? " (You)" : ""}${isPending ? " (Pending)" : ""}`}
                      description={
                        isZero
                          ? isPending
                            ? "Settled up (Pending invitation)"
                            : "Settled up"
                          : isPositive
                            ? `Gets back ${formatCurrency(item.balance, group?.data?.currency)}${isPending ? " (Pending invitation)" : ""}`
                            : `Owes ${formatCurrency(Math.abs(item.balance), group?.data?.currency)}${isPending ? " (Pending invitation)" : ""}`
                      }
                      accessoryRight={() => (
                        <Layout style={styles.balanceItemRight}>
                          <Text
                            category="s1"
                            style={[
                              styles.balanceAmountSmall,
                              {
                                color: isZero
                                  ? "#666"
                                  : isPositive
                                    ? "#4CAF50"
                                    : "#F44336",
                                opacity: isPending ? 0.7 : 1,
                              },
                            ]}
                          >
                            {isPositive ? "+" : ""}
                            {formatCurrency(
                              item.balance,
                              group?.data?.currency,
                            )}
                          </Text>
                          <Text
                            category="c1"
                            appearance="hint"
                            style={[
                              styles.balanceStatusSmall,
                              { opacity: isPending ? 0.7 : 1 },
                            ]}
                          >
                            {isPending
                              ? isZero
                                ? "Pending"
                                : isPositive
                                  ? "Credit*"
                                  : "Debt*"
                              : isZero
                                ? "Settled"
                                : isPositive
                                  ? "Credit"
                                  : "Debt"}
                          </Text>
                        </Layout>
                      )}
                    />
                  );
                }}
                ItemSeparatorComponent={Divider}
              />
            </Layout>
          ) : (
            <Layout style={styles.emptyBalances}>
              <Ionicons
                name="people-outline"
                size={48}
                color="#8F9BB3"
                style={styles.emptyIcon}
              />
              <Text category="s1" appearance="hint" style={styles.emptyText}>
                No members to show balances for
              </Text>
            </Layout>
          )}

          {settlements.length === 0 && sortedBalances.length > 0 && (
            <Layout style={styles.settledMessage}>
              <Ionicons
                name="checkmark-circle-outline"
                size={32}
                color="#4CAF50"
                style={styles.settledIcon}
              />
              <Text category="s1" style={styles.settledText}>
                All balances are settled!
              </Text>
            </Layout>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.icon} />
    </TouchableOpacity>
  );

  const renderRefreshAction = () => (
    <TouchableOpacity
      onPress={handleRefresh}
      style={[
        styles.refreshButton,
        refreshLoading && styles.refreshButtonDisabled,
      ]}
      disabled={refreshLoading}
    >
      <Ionicons
        name={refreshLoading ? "hourglass-outline" : "refresh-outline"}
        size={24}
        color={refreshLoading ? colors.icon + "60" : colors.icon}
      />
    </TouchableOpacity>
  );

  const renderLoadingAlert = () => {
    if (!showLoadingAlert) return null;

    return (
      <View
        style={[
          styles.loadingAlert,
          { backgroundColor: colors.primary + "15" },
        ]}
      >
        <View style={styles.loadingAlertContent}>
          <Spinner size="small" status="primary" />
          <Text style={[styles.loadingAlertText, { color: colors.primary }]}>
            Refreshing expenses...
          </Text>
        </View>
      </View>
    );
  };

  if (!group) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <TopNavigation
            title="Group Details"
            alignment="center"
            accessoryLeft={renderBackAction}
            accessoryRight={renderRefreshAction}
            style={{ backgroundColor: colors.background }}
          />
          {renderLoadingAlert()}
          <Layout style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.error}
              style={styles.errorIcon}
            />
            <Text
              category="h6"
              style={[styles.errorTitle, { color: colors.text }]}
            >
              Group not found
            </Text>
            <Text
              category="s1"
              appearance="hint"
              style={[styles.errorDescription, { color: colors.icon }]}
            >
              {t("groupDetail.groupNotFoundDescription")}
            </Text>
            <Button onPress={navigateBack}>Go Back</Button>
          </Layout>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const userTotalShare =
    group.expenses
      ?.filter((expense) => expense.data.status !== "deleted")
      .reduce((sum, expense) => {
        try {
          return sum + calculateUserShare(expense, user?.id || "");
        } catch {
          return sum;
        }
      }, 0) || 0;

  const isPending = group.membership_status === "pending";

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TopNavigation
          title={group.data?.name || "Group Details"}
          alignment="center"
          accessoryLeft={renderBackAction}
          accessoryRight={renderRefreshAction}
          style={{ backgroundColor: colors.background }}
        />

        {renderLoadingAlert()}

        {isPending ? (
          <Layout style={styles.pendingContainer}>
            <Card style={styles.pendingCard}>
              <Layout style={styles.pendingHeader}>
                <Ionicons
                  name="mail-outline"
                  size={48}
                  color="#FF9800"
                  style={styles.pendingIcon}
                />
                <Text category="h6" style={styles.pendingTitle}>
                  Invitation Pending
                </Text>
                <Text
                  category="s1"
                  appearance="hint"
                  style={styles.pendingDescription}
                >
                  {t("groupDetail.invitedToJoin") +
                    ` ${group.data?.name} ` +
                    t("groupDetail.acceptInvitation")}
                </Text>
              </Layout>
              <Layout style={styles.pendingActions}>
                <Button
                  style={[styles.actionButton, styles.declineButton]}
                  status="danger"
                  onPress={() => handleInvitation(false)}
                >
                  {t("groupDetail.decline")}
                </Button>
                <Button
                  style={styles.actionButton}
                  status="success"
                  onPress={() => handleInvitation(true)}
                >
                  {t("groupDetail.accept")}
                </Button>
              </Layout>
            </Card>
          </Layout>
        ) : (
          <>
            <View style={styles.header}>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.card, shadowColor: colors.text },
                ]}
              >
                <Text style={[styles.groupName, { color: colors.text }]}>
                  {group.data?.name}
                </Text>
                {group.data?.description && (
                  <Text
                    style={[styles.groupDescription, { color: colors.icon }]}
                  >
                    {group.data.description}
                  </Text>
                )}
                <View style={styles.currencyInfo}>
                  <Ionicons name="card-outline" size={16} color={colors.icon} />
                  <Text style={[styles.currencyText, { color: colors.icon }]}>
                    {t("groupDetail.defaultCurrency") + group.data?.currency ||
                      "USD"}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text
                      style={[styles.summaryNumber, { color: colors.primary }]}
                    >
                      {formatCurrency(userTotalShare, group.data?.currency)}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                      {t("groupDetail.yourShare")}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text
                      style={[styles.summaryNumber, { color: colors.primary }]}
                    >
                      {group.expenses?.filter(
                        (expense) => expense.data.status !== "deleted",
                      ).length || 0}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                      {t("groupDetail.expenses")}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text
                      style={[styles.summaryNumber, { color: colors.primary }]}
                    >
                      {group.members?.length || 0}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                      {t("groupDetail.members")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <TabView
              style={styles.tabView}
              selectedIndex={selectedIndex}
              onSelect={(index) => setSelectedIndex(index)}
            >
              <Tab title="Expenses">
                <View style={styles.tabContent}>
                  {group.expenses &&
                  group.expenses.filter(
                    (expense) => expense.data.status !== "deleted",
                  ).length > 0 ? (
                    <ScrollView
                      style={styles.expensesList}
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.expensesContainer}>
                        {group.expenses
                          .filter(
                            (expense) => expense.data.status !== "deleted",
                          )
                          .map((item) => (
                            <View key={item.id}>
                              {renderExpenseItem({ item })}
                            </View>
                          ))}
                      </View>
                      <View style={{ height: 100 }} />
                    </ScrollView>
                  ) : (
                    <Layout style={styles.emptyState}>
                      <Ionicons
                        name="document-text-outline"
                        size={64}
                        color={colors.icon}
                        style={styles.emptyIcon}
                      />
                      <Text
                        category="h6"
                        style={[styles.emptyTitle, { color: colors.text }]}
                      >
                        {t("groupDetail.noExpensesYet")}
                      </Text>
                      <Text
                        category="s1"
                        appearance="hint"
                        style={[
                          styles.emptyDescription,
                          { color: colors.icon },
                        ]}
                      >
                        {t("groupDetail.startTrackingExpenses")}
                      </Text>
                      <Button
                        style={styles.addButton}
                        accessoryLeft={(props) => (
                          <Ionicons
                            name="add"
                            size={20}
                            color={props?.tintColor || "#FFFFFF"}
                          />
                        )}
                        onPress={handleAddExpense}
                      >
                        {t("groupDetail.addExpense")}
                      </Button>
                    </Layout>
                  )}
                </View>
              </Tab>
              <Tab title="Balances">{renderBalancesTab()}</Tab>
              <Tab title="Members">
                <Layout style={styles.tabContent}>
                  <Layout style={styles.membersHeader}>
                    <Text category="h6" style={styles.membersTitle}>
                      Group Members
                    </Text>
                    <Button
                      style={styles.inviteButton}
                      size="small"
                      accessoryLeft={(props) => (
                        <Ionicons
                          name="person-add-outline"
                          size={16}
                          color={props?.tintColor || "#FFFFFF"}
                        />
                      )}
                      onPress={() => setInviteModalVisible(true)}
                    >
                      {t("groupDetail.invite")}
                    </Button>
                  </Layout>
                  {group.members && group.members.length > 0 ? (
                    <List
                      style={styles.membersList}
                      data={group.members}
                      renderItem={renderMemberItem}
                      ItemSeparatorComponent={Divider}
                    />
                  ) : (
                    <Layout style={styles.emptyState}>
                      <Ionicons
                        name="people-outline"
                        size={64}
                        color="#8F9BB3"
                        style={styles.emptyIcon}
                      />
                      <Text category="h6" style={styles.emptyTitle}>
                        {t("groupDetail.noMembers")}
                      </Text>
                      <Text
                        category="s1"
                        appearance="hint"
                        style={styles.emptyDescription}
                      >
                        {t("groupDetail.inviteOthersToJoin")}
                      </Text>
                      <Button
                        style={styles.addButton}
                        accessoryLeft={(props) => (
                          <Ionicons
                            name="person-add-outline"
                            size={20}
                            color={props?.tintColor || "#FFFFFF"}
                          />
                        )}
                        onPress={() => setInviteModalVisible(true)}
                      >
                        {t("groupDetail.inviteMember")}
                      </Button>
                    </Layout>
                  )}
                </Layout>
              </Tab>
              <Tab title="Refunds">
                <Layout style={styles.tabContent}>
                  <Layout style={styles.refundsHeader}>
                    <Text category="h6" style={styles.refundsTitle}>
                      {t("groupDetail.groupRefunds")}
                    </Text>
                    <Button
                      style={styles.addRefundButton}
                      size="small"
                      accessoryLeft={(props) => (
                        <Ionicons
                          name="add-outline"
                          size={16}
                          color={props?.tintColor || "#FFFFFF"}
                        />
                      )}
                      onPress={() => {
                        setEditingRefund(null);
                        setRefundFormData({
                          from_user_id: "",
                          to_user_id: "",
                          amount: "",
                          description: "",
                        });
                        setRefundModalVisible(true);
                      }}
                    >
                      {t("groupDetail.addRefund")}
                    </Button>
                  </Layout>
                  {group.data?.refunds && group.data.refunds.length > 0 ? (
                    <List
                      style={styles.refundsList}
                      data={group.data.refunds}
                      renderItem={({ item }) => {
                        const isFromCurrentUser =
                          item.from_user_id === user?.id;
                        const isToCurrentUser = item.to_user_id === user?.id;
                        const canEdit = isFromCurrentUser;

                        // Get usernames from group members
                        const fromMember = group.members.find(
                          (m) => m.user_id === item.from_user_id,
                        );
                        const toMember = group.members.find(
                          (m) => m.user_id === item.to_user_id,
                        );
                        const fromUsername = fromMember?.username || "Unknown";
                        const toUsername = toMember?.username || "Unknown";

                        return (
                          <ListItem
                            title={`${fromUsername} → ${toUsername}`}
                            description={`${formatDate(item.date)}${item.description ? ` • ${item.description}` : ""}`}
                            accessoryLeft={() => (
                              <Layout
                                style={[
                                  styles.refundIcon,
                                  {
                                    backgroundColor: isFromCurrentUser
                                      ? "#FF6B6B20"
                                      : isToCurrentUser
                                        ? "#4CAF5020"
                                        : "#8F9BB320",
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    isFromCurrentUser
                                      ? "arrow-up-outline"
                                      : "arrow-down-outline"
                                  }
                                  size={20}
                                  color={
                                    isFromCurrentUser
                                      ? "#FF6B6B"
                                      : isToCurrentUser
                                        ? "#4CAF50"
                                        : "#8F9BB3"
                                  }
                                />
                              </Layout>
                            )}
                            accessoryRight={() => (
                              <Layout style={styles.refundAccessory}>
                                <Text
                                  category="h6"
                                  style={[
                                    styles.refundAmount,
                                    {
                                      color: isFromCurrentUser
                                        ? "#FF6B6B"
                                        : isToCurrentUser
                                          ? "#4CAF50"
                                          : colors.text,
                                    },
                                  ]}
                                >
                                  {formatCurrency(item.amount, item.currency)}
                                </Text>
                                {canEdit && (
                                  <Layout style={styles.refundActions}>
                                    <TouchableOpacity
                                      onPress={() => handleEditRefund(item)}
                                      style={styles.refundActionButton}
                                    >
                                      <Ionicons
                                        name="pencil-outline"
                                        size={16}
                                        color="#8F9BB3"
                                      />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() =>
                                        handleDeleteRefund(item.id)
                                      }
                                      style={styles.refundActionButton}
                                    >
                                      <Ionicons
                                        name="trash-outline"
                                        size={16}
                                        color="#F44336"
                                      />
                                    </TouchableOpacity>
                                  </Layout>
                                )}
                              </Layout>
                            )}
                          />
                        );
                      }}
                      ItemSeparatorComponent={Divider}
                    />
                  ) : (
                    <Layout style={styles.emptyState}>
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={64}
                        color={colors.icon}
                        style={styles.emptyIcon}
                      />
                      <Text
                        category="h6"
                        style={[styles.emptyTitle, { color: colors.text }]}
                      >
                        {t("groupDetail.noRefundsYet")}
                      </Text>
                      <Text
                        category="s1"
                        appearance="hint"
                        style={[
                          styles.emptyDescription,
                          { color: colors.icon },
                        ]}
                      >
                        {t("groupDetail.recordRefunds")}
                      </Text>
                      <Button
                        style={styles.addButton}
                        accessoryLeft={(props) => (
                          <Ionicons
                            name="add"
                            size={20}
                            color={props?.tintColor || "#FFFFFF"}
                          />
                        )}
                        onPress={() => {
                          setEditingRefund(null);
                          setRefundFormData({
                            from_user_id: "",
                            to_user_id: "",
                            amount: "",
                            description: "",
                          });
                          setRefundModalVisible(true);
                        }}
                      >
                        {t("groupDetail.addRefund")}
                      </Button>
                    </Layout>
                  )}
                </Layout>
              </Tab>
            </TabView>

            <Button
              style={styles.fab}
              accessoryLeft={(props) => (
                <Ionicons
                  name="add"
                  size={20}
                  color={props?.tintColor || "#FFFFFF"}
                />
              )}
              onPress={handleAddExpense}
              size="large"
              status="primary"
            />
          </>
        )}

        <Modal
          visible={inviteModalVisible}
          backdropStyle={styles.backdrop}
          onBackdropPress={() => setInviteModalVisible(false)}
        >
          <Card disabled={true}>
            <Text category="h6" style={styles.modalTitle}>
              Invite Member
            </Text>
            <Text
              category="s1"
              appearance="hint"
              style={styles.modalDescription}
            >
              {t("groupDetail.inviteMemberDescription")}
            </Text>

            <Input
              style={styles.modalInput}
              placeholder="Enter username"
              value={inviteUsername}
              onChangeText={setInviteUsername}
              autoCapitalize="none"
            />

            <Layout style={styles.modalActions}>
              <Button
                style={styles.modalButton}
                appearance="outline"
                onPress={() => {
                  setInviteModalVisible(false);
                  setInviteUsername("");
                }}
              >
                {t("groupDetail.cancel")}
              </Button>
              <Button
                style={styles.modalButton}
                onPress={handleInviteUser}
                disabled={inviteLoading}
                accessoryLeft={
                  inviteLoading
                    ? () => <Spinner size="small" status="control" />
                    : undefined
                }
              >
                {inviteLoading
                  ? t("groupDetail.inviting")
                  : t("groupDetail.sendInvite")}
              </Button>
            </Layout>
          </Card>
        </Modal>

        <Modal
          visible={refundModalVisible}
          backdropStyle={styles.backdrop}
          onBackdropPress={() => {
            setRefundModalVisible(false);
            setEditingRefund(null);
            setRefundFormData({
              from_user_id: "",
              to_user_id: "",
              amount: "",
              description: "",
            });
          }}
        >
          <Card disabled={true}>
            <Text category="h6" style={styles.modalTitle}>
              {editingRefund
                ? t("groupDetail.editRefund")
                : t("groupDetail.addRefund")}
            </Text>
            <Text
              category="s1"
              appearance="hint"
              style={styles.modalDescription}
            >
              {t("groupDetail.addRefundDescription")}
            </Text>

            <Text category="label" style={styles.fieldLabel}>
              {t("groupDetail.refundFrom")}
            </Text>
            <Layout style={styles.selectContainer}>
              {group?.members?.map((member) => (
                <TouchableOpacity
                  key={member.user_id}
                  style={[
                    styles.memberSelectItem,
                    refundFormData.from_user_id === member.user_id &&
                      styles.memberSelectItemSelected,
                  ]}
                  onPress={() =>
                    setRefundFormData((prev) => ({
                      ...prev,
                      from_user_id: member.user_id,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.memberSelectText,
                      refundFormData.from_user_id === member.user_id &&
                        styles.memberSelectTextSelected,
                    ]}
                  >
                    {member.username}
                    {member.status === "pending" ? " (Pending)" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </Layout>

            <Text category="label" style={styles.fieldLabel}>
              {t("groupDetail.refundTo")}
            </Text>
            <Layout style={styles.selectContainer}>
              {group?.members?.map((member) => (
                <TouchableOpacity
                  key={member.user_id}
                  style={[
                    styles.memberSelectItem,
                    refundFormData.to_user_id === member.user_id &&
                      styles.memberSelectItemSelected,
                  ]}
                  onPress={() =>
                    setRefundFormData((prev) => ({
                      ...prev,
                      to_user_id: member.user_id,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.memberSelectText,
                      refundFormData.to_user_id === member.user_id &&
                        styles.memberSelectTextSelected,
                    ]}
                  >
                    {member.username}
                    {member.status === "pending" ? " (Pending)" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </Layout>

            <Input
              style={styles.modalInput}
              label={t("groupDetail.amount")}
              placeholder="0.00"
              value={refundFormData.amount}
              onChangeText={(text) =>
                setRefundFormData((prev) => ({ ...prev, amount: text }))
              }
              keyboardType="numeric"
            />

            <Input
              style={styles.modalInput}
              label={t("groupDetail.description")}
              placeholder={t("groupDetail.refundDescription")}
              value={refundFormData.description}
              onChangeText={(text) =>
                setRefundFormData((prev) => ({ ...prev, description: text }))
              }
              multiline
            />

            <Layout style={styles.modalActions}>
              <Button
                style={styles.modalButton}
                appearance="outline"
                onPress={() => {
                  setRefundModalVisible(false);
                  setEditingRefund(null);
                  setRefundFormData({
                    from_user_id: "",
                    to_user_id: "",
                    amount: "",
                    description: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                style={styles.modalButton}
                onPress={handleRefundSubmit}
                disabled={
                  refundLoading ||
                  !refundFormData.from_user_id ||
                  !refundFormData.to_user_id ||
                  !refundFormData.amount
                }
                accessoryLeft={
                  refundLoading
                    ? () => <Spinner size="small" status="control" />
                    : undefined
                }
              >
                {refundLoading
                  ? t("groupDetail.saving")
                  : editingRefund
                    ? t("groupDetail.update")
                    : t("groupDetail.addRefund")}
              </Button>
            </Layout>
          </Card>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  errorDescription: {
    marginBottom: 20,
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupName: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  currencyInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  currencyText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  pendingContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  pendingCard: {
    padding: 24,
  },
  pendingHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  pendingIcon: {
    marginBottom: 16,
  },
  pendingTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  pendingDescription: {
    textAlign: "center",
    lineHeight: 20,
  },
  pendingActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
  },
  declineButton: {
    marginRight: 8,
  },
  tabView: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  expensesList: {
    flex: 1,
  },
  expensesContainer: {
    paddingTop: 10,
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  memberAccessory: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberInfo: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  memberStatus: {
    alignItems: "flex-end",
  },
  memberStatusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  currentUserText: {
    fontSize: 10,
    fontStyle: "italic",
  },
  balanceInfo: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  balanceStatus: {
    fontSize: 10,
    marginTop: 1,
  },
  removeButton: {
    padding: 4,
  },
  balancesHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  balancesTitle: {
    marginBottom: 4,
  },
  balancesSubtitle: {
    lineHeight: 18,
  },
  balancesList: {
    flex: 1,
  },
  balanceItemRight: {
    alignItems: "flex-end",
  },
  balanceAmountLarge: {
    fontWeight: "700",
    fontSize: 18,
  },
  balanceStatusLarge: {
    marginTop: 2,
    fontSize: 12,
  },
  emptyBalances: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 16,
  },
  membersHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  membersTitle: {
    flex: 1,
  },
  inviteButton: {
    paddingHorizontal: 16,
  },
  membersList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    marginBottom: 24,
    textAlign: "center",
  },
  addButton: {
    paddingHorizontal: 24,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    borderRadius: 28,
    elevation: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  loadingAlert: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(51, 102, 255, 0.2)",
  },
  loadingAlertContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingAlertText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalTitle: {
    marginBottom: 8,
  },
  modalDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    marginLeft: 8,
  },
  refundsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refundsTitle: {
    flex: 1,
  },
  addRefundButton: {
    paddingHorizontal: 16,
  },
  refundsList: {
    flex: 1,
  },
  refundIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  refundAccessory: {
    alignItems: "flex-end",
  },
  refundAmount: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  refundActions: {
    flexDirection: "row",
    gap: 8,
  },
  refundActionButton: {
    padding: 4,
  },
  fieldLabel: {
    marginBottom: 8,
    marginTop: 16,
  },
  selectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  memberSelectItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E4E9F2",
    backgroundColor: "#FAFBFC",
  },
  memberSelectItemSelected: {
    borderColor: "#3366FF",
    backgroundColor: "#3366FF20",
  },
  memberSelectText: {
    fontSize: 14,
    color: "#8F9BB3",
  },
  memberSelectTextSelected: {
    color: "#3366FF",
    fontWeight: "600",
  },
  settlementsSection: {
    marginBottom: 20,
  },
  settlementsList: {
    backgroundColor: "transparent",
  },
  settlementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settlementAmount: {
    alignItems: "flex-end",
  },
  settlementAmountText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  settlementStatus: {
    fontSize: 12,
  },
  balancesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontWeight: "600",
    color: "#8F9BB3",
  },
  balanceAmountSmall: {
    fontSize: 14,
    fontWeight: "500",
  },
  balanceStatusSmall: {
    fontSize: 10,
    marginTop: 2,
  },
  settledMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginTop: 16,
    backgroundColor: "#4CAF5010",
    borderRadius: 8,
    marginHorizontal: 16,
  },
  settledIcon: {
    marginRight: 8,
  },
  settledText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  balancesScrollView: {
    flex: 1,
  },
});
