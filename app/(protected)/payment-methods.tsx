import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Text,
  Input,
  TopNavigation,
  TopNavigationAction,
  Button,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { BASE_PAYMENT_METHODS, computePaymentMethods } from "@/types/expense";

const EMOJI_SUGGESTIONS = [
  "💵",
  "💳",
  "🏦",
  "📱",
  "📝",
  "💰",
  "💎",
  "🎫",
  "🪙",
  "💸",
  "🏪",
  "🛒",
  "📊",
  "🔐",
  "⚡",
  "🌐",
  "📲",
  "💻",
  "🎮",
  "🛍️",
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { userProfile, updateProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [addingMethod, setAddingMethod] = useState(false);
  const [methodName, setMethodName] = useState("");
  const [methodIcon, setMethodIcon] = useState("💳");

  const currentOverrides = useMemo(
    () =>
      userProfile?.profile?.budgeting?.paymentMethodOverrides || {
        edited: {},
        deleted: [],
        added: [],
      },
    [userProfile?.profile?.budgeting?.paymentMethodOverrides],
  );

  const computedMethods = useMemo(
    () => computePaymentMethods(currentOverrides),
    [currentOverrides],
  );

  const navigateBack = () => {
    router.back();
  };

  const handleEditMethod = (
    methodId: string,
    currentName: string,
    currentIcon: string,
  ) => {
    setEditingMethod(methodId);
    setMethodName(currentName);
    setMethodIcon(currentIcon);
  };

  const handleSaveEdit = async () => {
    if (!editingMethod || !methodName.trim()) return;

    setLoading(true);
    try {
      const newOverrides = { ...currentOverrides };

      // Check if it's a base method being edited
      const baseMethod = BASE_PAYMENT_METHODS.find(
        (method) => method.id === editingMethod,
      );
      if (baseMethod) {
        newOverrides.edited[editingMethod] = {
          name: methodName.trim(),
          icon: methodIcon,
        };
      } else {
        // It's a custom method, update it in the added array
        const addedIndex = newOverrides.added.findIndex(
          (method) => method.id === editingMethod,
        );
        if (addedIndex !== -1) {
          newOverrides.added[addedIndex] = {
            ...newOverrides.added[addedIndex],
            name: methodName.trim(),
            icon: methodIcon,
          };
        }
      }

      await updateProfile({
        budgeting: {
          ...userProfile?.profile?.budgeting,
          paymentMethodOverrides: newOverrides,
        },
      });

      setEditingMethod(null);
      setMethodName("");
      setMethodIcon("💳");
    } catch (error) {
      console.error("Error saving payment method:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMethod(null);
    setMethodName("");
    setMethodIcon("💳");
  };

  const handleAddMethod = async () => {
    if (!methodName.trim()) {
      Alert.alert("Error", "Please enter a payment method name");
      return;
    }

    const id = methodName.toLowerCase().replace(/\s+/g, "_");

    // Check if ID already exists
    const existsInBase = BASE_PAYMENT_METHODS.some(
      (method) => method.id === id,
    );
    const existsInAdded = currentOverrides.added.some(
      (method) => method.id === id,
    );

    if (existsInBase || existsInAdded) {
      Alert.alert("Error", "A payment method with this name already exists");
      return;
    }

    setLoading(true);
    try {
      const newOverrides = { ...currentOverrides };
      newOverrides.added = [
        ...newOverrides.added,
        {
          id,
          name: methodName.trim(),
          icon: methodIcon,
        },
      ];

      await updateProfile({
        budgeting: {
          ...userProfile?.profile?.budgeting,
          paymentMethodOverrides: newOverrides,
        },
      });

      setAddingMethod(false);
      setMethodName("");
      setMethodIcon("💳");
    } catch (error) {
      console.error("Error adding payment method:", error);
      Alert.alert("Error", "Failed to add payment method. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAdd = () => {
    setAddingMethod(false);
    setMethodName("");
    setMethodIcon("💳");
  };

  const handleDeleteMethod = async (methodId: string) => {
    const method = computedMethods.find((m) => m.id === methodId);
    if (!method) return;

    const isCustom = !BASE_PAYMENT_METHODS.some((base) => base.id === methodId);

    Alert.alert(
      "Delete Payment Method",
      `Are you sure you want to delete "${method.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const newOverrides = { ...currentOverrides };

              if (isCustom) {
                // Remove from added custom methods
                newOverrides.added = newOverrides.added.filter(
                  (method) => method.id !== methodId,
                );
              } else {
                // Mark base method as deleted
                if (!newOverrides.deleted.includes(methodId)) {
                  newOverrides.deleted = [...newOverrides.deleted, methodId];
                }
                // Remove from edited if it was edited
                if (newOverrides.edited[methodId]) {
                  delete newOverrides.edited[methodId];
                }
              }

              await updateProfile({
                budgeting: {
                  ...userProfile?.profile?.budgeting,
                  paymentMethodOverrides: newOverrides,
                },
              });
            } catch (error) {
              console.error("Error deleting payment method:", error);
              Alert.alert(
                "Error",
                "Failed to delete payment method. Please try again.",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const restoreMethod = async (methodId: string) => {
    setLoading(true);
    try {
      const newOverrides = { ...currentOverrides };

      // Remove from deleted list
      newOverrides.deleted = newOverrides.deleted.filter(
        (id) => id !== methodId,
      );

      await updateProfile({
        budgeting: {
          ...userProfile?.profile?.budgeting,
          paymentMethodOverrides: newOverrides,
        },
      });
    } catch (error) {
      console.error("Error restoring payment method:", error);
      Alert.alert(
        "Error",
        "Failed to restore payment method. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderBackAction = () => (
    <TopNavigationAction
      icon={(props) => (
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      )}
      onPress={navigateBack}
    />
  );

  const renderEmojiPicker = () => (
    <View style={styles.emojiContainer}>
      <Text style={[styles.emojiLabel, { color: colors.text }]}>
        Choose Icon:
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.emojiScroll}
      >
        {EMOJI_SUGGESTIONS.map((emoji, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.emojiButton,
              {
                backgroundColor:
                  methodIcon === emoji
                    ? colors.primary + "20"
                    : colors.background,
              },
            ]}
            onPress={() => setMethodIcon(emoji)}
            disabled={loading}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TopNavigation
        title="Manage Payment Methods"
        alignment="center"
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Payment Methods */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Active Payment Methods
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setAddingMethod(true)}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {computedMethods.map((method) => {
            const isDeleted = currentOverrides.deleted.includes(method.id);
            const isEdited = currentOverrides.edited[method.id];
            const isCustom = !BASE_PAYMENT_METHODS.some(
              (base) => base.id === method.id,
            );

            if (isDeleted) return null;

            return (
              <View key={method.id} style={styles.methodRow}>
                {editingMethod === method.id ? (
                  <View style={styles.editForm}>
                    <View style={styles.editInputRow}>
                      <Input
                        style={styles.nameInput}
                        placeholder="Method name"
                        value={methodName}
                        onChangeText={setMethodName}
                        disabled={loading}
                      />
                      <TouchableOpacity
                        style={[
                          styles.iconPreview,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <Text style={styles.iconText}>{methodIcon}</Text>
                      </TouchableOpacity>
                    </View>
                    {renderEmojiPicker()}
                    <View style={styles.editActions}>
                      <Button
                        style={styles.actionButton}
                        appearance="outline"
                        onPress={handleCancelEdit}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        style={styles.actionButton}
                        onPress={handleSaveEdit}
                        disabled={loading || !methodName.trim()}
                      >
                        Save
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodIcon}>{method.icon}</Text>
                    <Text style={[styles.methodName, { color: colors.text }]}>
                      {method.name}
                    </Text>
                    {isEdited && (
                      <View
                        style={[
                          styles.modifiedBadge,
                          { backgroundColor: colors.warning + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.modifiedText,
                            { color: colors.warning },
                          ]}
                        >
                          Modified
                        </Text>
                      </View>
                    )}
                    {isCustom && (
                      <View
                        style={[
                          styles.customBadge,
                          { backgroundColor: colors.success + "20" },
                        ]}
                      >
                        <Text
                          style={[styles.customText, { color: colors.success }]}
                        >
                          Custom
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {editingMethod !== method.id && (
                  <View style={styles.methodActions}>
                    <TouchableOpacity
                      style={[
                        styles.iconActionButton,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                      onPress={() =>
                        handleEditMethod(method.id, method.name, method.icon)
                      }
                    >
                      <Ionicons
                        name="pencil"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.iconActionButton,
                        { backgroundColor: colors.error + "20" },
                      ]}
                      onPress={() => handleDeleteMethod(method.id)}
                    >
                      <Ionicons name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* Add New Method Form */}
          {addingMethod && (
            <View style={[styles.methodRow, styles.addMethodRow]}>
              <View style={styles.editForm}>
                <View style={styles.editInputRow}>
                  <Input
                    style={styles.nameInput}
                    placeholder="New method name"
                    value={methodName}
                    onChangeText={setMethodName}
                    disabled={loading}
                  />
                  <TouchableOpacity
                    style={[
                      styles.iconPreview,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text style={styles.iconText}>{methodIcon}</Text>
                  </TouchableOpacity>
                </View>
                {renderEmojiPicker()}
                <View style={styles.editActions}>
                  <Button
                    style={styles.actionButton}
                    appearance="outline"
                    onPress={handleCancelAdd}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    style={styles.actionButton}
                    onPress={handleAddMethod}
                    disabled={loading || !methodName.trim()}
                  >
                    Add
                  </Button>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Deleted Methods */}
        {currentOverrides.deleted.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, shadowColor: colors.text },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Deleted Payment Methods
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.icon }]}>
              These methods are hidden but can be restored.
            </Text>

            {currentOverrides.deleted.map((methodId) => {
              const baseMethod = BASE_PAYMENT_METHODS.find(
                (m) => m.id === methodId,
              );
              if (!baseMethod) return null;

              return (
                <View
                  key={methodId}
                  style={[styles.methodRow, styles.deletedRow]}
                >
                  <View style={styles.methodInfo}>
                    <Text style={[styles.methodIcon, styles.deletedIcon]}>
                      {baseMethod.icon}
                    </Text>
                    <Text style={[styles.methodName, styles.deletedText]}>
                      {baseMethod.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.iconActionButton,
                      { backgroundColor: colors.success + "20" },
                    ]}
                    onPress={() => restoreMethod(methodId)}
                  >
                    <Ionicons name="refresh" size={16} color={colors.success} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  addMethodRow: {
    backgroundColor: "rgba(0,0,0,0.02)",
    flexDirection: "column",
    alignItems: "stretch",
  },
  deletedRow: {
    opacity: 0.6,
  },
  methodInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  methodIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: "center",
  },
  deletedIcon: {
    opacity: 0.5,
  },
  methodName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  deletedText: {
    opacity: 0.5,
  },
  modifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  modifiedText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  customText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  methodActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    flex: 1,
  },
  editForm: {
    flex: 1,
  },
  editInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  nameInput: {
    flex: 1,
    marginRight: 12,
  },
  iconPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  iconText: {
    fontSize: 18,
  },
  emojiContainer: {
    marginBottom: 12,
  },
  emojiLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  emojiScroll: {
    flexDirection: "row",
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  emojiText: {
    fontSize: 16,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
});
