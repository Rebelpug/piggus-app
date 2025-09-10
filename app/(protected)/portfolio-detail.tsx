import React, { useState, useMemo } from "react";
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
import { useInvestment } from "@/context/InvestmentContext";
import { useAuth } from "@/context/AuthContext";
import { useLocalization } from "@/context/LocalizationContext";
import { InvestmentWithDecryptedData } from "@/types/investment";
import { Ionicons } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import InvestmentItem from "@/components/investments/InvestmentItem";

export default function PortfolioDetailScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { t } = useLocalization();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    portfolios,
    inviteUserToPortfolio,
    handlePortfolioInvitation,
    removeUserFromPortfolio,
  } = useInvestment();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const portfolio = useMemo(() => {
    return portfolios.find((p) => p.id === id);
  }, [portfolios, id]);

  const navigateBack = () => {
    router.back();
  };

  const handleAddInvestment = () => {
    router.push({
      pathname: "/(protected)/add-investment",
      params: { portfolioId: portfolio?.id },
    });
  };

  const handleInviteUser = async () => {
    if (!inviteUsername.trim() || !portfolio) {
      Alert.alert(
        t("portfolioDetail.error"),
        t("portfolioDetail.enterUsernameRequired"),
      );
      return;
    }

    setInviteLoading(true);
    try {
      const result = await inviteUserToPortfolio(
        portfolio.id,
        inviteUsername.trim(),
      );

      if (result.success) {
        setInviteModalVisible(false);
        setInviteUsername("");
      } else {
        Alert.alert(
          t("portfolioDetail.error"),
          result.error || t("portfolioDetail.inviteUserFailed"),
        );
      }
    } catch (error) {
      console.error(
        "Failed to invite user to portfolio",
        (error as Error).message,
      );
      Alert.alert(
        t("portfolioDetail.error"),
        t("portfolioDetail.inviteUserFailed"),
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string, username: string) => {
    if (!portfolio) return;

    Alert.alert(
      t("portfolioDetail.removeMember"),
      `${t("portfolioDetail.removeMemberConfirm")} ${username} ${t("portfolioDetail.fromPortfolio")}`,
      [
        { text: t("portfolioDetail.cancel"), style: "cancel" },
        {
          text: t("portfolioDetail.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              const result = await removeUserFromPortfolio(
                portfolio.id,
                userId,
              );
              if (!result.success) {
                Alert.alert(
                  t("portfolioDetail.error"),
                  result.error || t("portfolioDetail.removeMemberFailed"),
                );
              }
            } catch (error) {
              console.error(
                "Failed to remove user from portfolio",
                (error as Error).message,
              );
              Alert.alert(
                t("portfolioDetail.error"),
                t("portfolioDetail.removeMemberFailed"),
              );
            }
          },
        },
      ],
    );
  };

  const handleInvitation = async (accept: boolean) => {
    if (!portfolio) return;

    try {
      const result = await handlePortfolioInvitation(portfolio.id, accept);

      if (result.success) {
        router.back();
      } else {
        Alert.alert(
          t("portfolioDetail.error"),
          result.error || t("portfolioDetail.handleInvitationFailed"),
        );
      }
    } catch (error) {
      console.error("Failed to handle invitation", (error as Error).message);
      Alert.alert(
        t("portfolioDetail.error"),
        t("portfolioDetail.handleInvitationFailed"),
      );
    }
  };

  const renderInvestmentItem = ({
    item,
  }: {
    item: InvestmentWithDecryptedData & { portfolioName?: string };
  }) => {
    const portfolioId = portfolios.find((p) =>
      p.investments.some((inv) => inv.id === item.id),
    )?.id;
    return <InvestmentItem item={item} portfolioId={portfolioId} />;
  };

  const renderMemberItem = ({ item }: { item: any }) => {
    const isCurrentUser = item.user_id === user?.id;
    const canRemove = !isCurrentUser && item.status === "confirmed";

    return (
      <ListItem
        title={() => (
          <Layout style={styles.memberInfo}>
            <Layout style={styles.memberMainInfo}>
              <Text style={[styles.memberName, { color: colors.text }]}>
                {item.username}
                {isCurrentUser ? ` (${t("common.you")})` : ""}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === "confirmed" ? "#4CAF50" : "#FF9800",
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {item.status === "confirmed"
                    ? t("portfolioDetail.active")
                    : t("portfolioDetail.pending")}
                </Text>
              </View>
            </Layout>
            {canRemove && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveUser(item.user_id, item.username)}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color="#F44336"
                />
              </TouchableOpacity>
            )}
          </Layout>
        )}
      />
    );
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.icon} />
    </TouchableOpacity>
  );

  const renderRightAction = () => (
    <TouchableOpacity onPress={handleAddInvestment} style={styles.addButton}>
      <Ionicons name="add" size={24} color={colors.icon} />
    </TouchableOpacity>
  );

  if (!portfolio) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <TopNavigation
            title={t("portfolioDetail.title")}
            alignment="center"
            accessoryLeft={renderBackAction}
            style={{ backgroundColor: colors.background }}
          />
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
              {t("portfolioDetail.portfolioNotFound")}
            </Text>
            <Text
              category="s1"
              appearance="hint"
              style={[styles.errorDescription, { color: colors.icon }]}
            >
              {t("portfolioDetail.portfolioNotFoundDescription")}
            </Text>
            <Button onPress={navigateBack}>
              {t("portfolioDetail.goBack")}
            </Button>
          </Layout>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isPending = portfolio.membership_status === "pending";

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TopNavigation
          title={portfolio.data?.name || t("portfolioDetail.title")}
          alignment="center"
          accessoryLeft={renderBackAction}
          accessoryRight={renderRightAction}
          style={{ backgroundColor: colors.background }}
        />

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
                  {t("portfolioDetail.invitationPending")}
                </Text>
                <Text
                  category="s1"
                  appearance="hint"
                  style={styles.pendingDescription}
                >
                  {t("portfolioDetail.invitedToJoin") +
                    portfolio.data?.name +
                    t("portfolioDetail.acceptInvitation")}
                </Text>
              </Layout>
              <Layout style={styles.pendingActions}>
                <Button
                  style={[styles.actionButton, styles.declineButton]}
                  status="danger"
                  onPress={() => handleInvitation(false)}
                >
                  {t("portfolioDetail.decline")}
                </Button>
                <Button
                  style={styles.actionButton}
                  status="success"
                  onPress={() => handleInvitation(true)}
                >
                  {t("portfolioDetail.accept")}
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
                <Text style={[styles.portfolioName, { color: colors.text }]}>
                  {portfolio.data?.name}
                </Text>
                {portfolio.data?.description && (
                  <Text
                    style={[
                      styles.portfolioDescription,
                      { color: colors.icon },
                    ]}
                  >
                    {portfolio.data.description}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.statsButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/(protected)/investment-statistics",
                      params: { portfolioId: portfolio.id },
                    })
                  }
                >
                  <Ionicons
                    name="stats-chart-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.statsButtonText, { color: colors.primary }]}
                  >
                    {t("portfolioDetail.seeMoreStats")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TabView
              style={styles.tabView}
              selectedIndex={selectedIndex}
              onSelect={(index) => setSelectedIndex(index)}
            >
              <Tab title={t("portfolioDetail.investments")}>
                <View style={styles.tabContent}>
                  {portfolio.investments && portfolio.investments.length > 0 ? (
                    <ScrollView
                      style={styles.investmentsList}
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.investmentsContainer}>
                        {portfolio.investments.map((item) => (
                          <View key={item.id}>
                            {renderInvestmentItem({ item })}
                          </View>
                        ))}
                      </View>
                      <View style={{ height: 100 }} />
                    </ScrollView>
                  ) : (
                    <Layout style={styles.emptyState}>
                      <Ionicons
                        name="trending-up-outline"
                        size={64}
                        color={colors.icon}
                        style={styles.emptyIcon}
                      />
                      <Text
                        category="h6"
                        style={[styles.emptyTitle, { color: colors.text }]}
                      >
                        {t("portfolioDetail.noInvestmentsYet")}
                      </Text>
                      <Text
                        category="s1"
                        appearance="hint"
                        style={[
                          styles.emptyDescription,
                          { color: colors.icon },
                        ]}
                      >
                        {t("portfolioDetail.startBuildingPortfolio")}
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
                        onPress={handleAddInvestment}
                      >
                        {t("portfolioDetail.addInvestment")}
                      </Button>
                    </Layout>
                  )}
                </View>
              </Tab>
              <Tab title={t("portfolioDetail.members")}>
                <Layout style={styles.tabContent}>
                  <Layout style={styles.membersHeader}>
                    <Text category="h6" style={styles.membersTitle}>
                      {t("portfolioDetail.portfolioMembers")}
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
                      {t("portfolioDetail.invite")}
                    </Button>
                  </Layout>
                  {portfolio.members && portfolio.members.length > 0 ? (
                    <List
                      style={styles.membersList}
                      data={portfolio.members}
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
                        {t("portfolioDetail.noMembers")}
                      </Text>
                      <Text
                        category="s1"
                        appearance="hint"
                        style={styles.emptyDescription}
                      >
                        {t("portfolioDetail.inviteOthersToCollaborate")}
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
                        {t("portfolioDetail.inviteMember")}
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
              onPress={handleAddInvestment}
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
              {t("portfolioDetail.inviteUser")}
            </Text>
            <Input
              placeholder={t("portfolioDetail.enterUsername")}
              value={inviteUsername}
              onChangeText={setInviteUsername}
              style={styles.modalInput}
            />
            <Layout style={styles.modalActions}>
              <Button
                style={styles.modalButton}
                appearance="ghost"
                onPress={() => {
                  setInviteModalVisible(false);
                  setInviteUsername("");
                }}
              >
                {t("portfolioDetail.cancel")}
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
                  ? t("portfolioDetail.inviting")
                  : t("portfolioDetail.inviteButton")}
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
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  portfolioName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  portfolioDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  tabView: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 4,
  },
  investmentsList: {
    flex: 1,
  },
  investmentsContainer: {
    gap: 12,
  },
  investmentCard: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  investmentCardContent: {
    padding: 16,
  },
  investmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  investmentMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  investmentDetails: {
    flex: 1,
  },
  investmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  investmentSubtitle: {
    fontSize: 14,
  },
  investmentAmount: {
    alignItems: "flex-end",
  },
  currentValueText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  gainLossText: {
    fontSize: 12,
    fontWeight: "500",
  },
  membersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  inviteButton: {
    borderRadius: 12,
  },
  membersList: {
    backgroundColor: "transparent",
  },
  memberInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  memberMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
    textTransform: "uppercase",
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  addButton: {
    borderRadius: 12,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    borderRadius: 28,
    width: 56,
    height: 56,
  },
  pendingContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  pendingCard: {
    padding: 24,
    borderRadius: 20,
  },
  pendingHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  pendingIcon: {
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  pendingDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  pendingActions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  declineButton: {
    marginRight: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorDescription: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  backButton: {
    padding: 12,
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  statsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 6,
  },
  statsButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
