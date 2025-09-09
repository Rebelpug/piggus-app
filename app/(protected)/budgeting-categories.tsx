import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import {
  Text,
  Button,
  Input,
  TopNavigation,
  Spinner,
  Select,
  SelectItem,
  IndexPath,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";
import { Ionicons } from "@expo/vector-icons";
import {
  BASE_EXPENSE_CATEGORIES,
  computeExpenseCategories,
  getMainCategories,
  getSubcategories,
  validateCategoryHierarchy,
} from "@/types/expense";

const EMOJI_SUGGESTIONS = [
  "🍽️",
  "🚗",
  "🏠",
  "💡",
  "🎬",
  "🛍️",
  "⚕️",
  "📚",
  "💄",
  "✈️",
  "🎁",
  "📈",
  "💳",
  "🛡️",
  "📊",
  "📱",
  "📋",
  "💰",
  "🏦",
  "🔧",
  "🎯",
  "🌟",
  "❤️",
  "🔥",
  "💎",
  "🎨",
  "🍕",
  "☕",
  "🎮",
  "🐶",
  "🐱",
  "🌿",
  "🏋️",
  "🏃",
  "🎵",
  "🛒",
  "🎪",
  "🌈",
];

export default function BudgetingCategoriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { userProfile, updateProfile } = useProfile();
  const { t } = useLocalization();
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("📋");
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  const currentOverrides = useMemo(
    () =>
      userProfile?.profile?.budgeting?.categoryOverrides || {
        edited: {},
        deleted: [],
        added: [],
      },
    [userProfile?.profile?.budgeting?.categoryOverrides],
  );

  const computedCategories = useMemo(
    () => computeExpenseCategories(currentOverrides),
    [currentOverrides],
  );

  const mainCategories = useMemo(
    () => getMainCategories(computedCategories),
    [computedCategories],
  );

  const navigateBack = () => {
    router.back();
  };

  const handleEditCategory = (
    categoryId: string,
    currentName: string,
    currentIcon: string,
    currentParent?: string,
  ) => {
    setEditingCategory(categoryId);
    setCategoryName(currentName);
    setCategoryIcon(currentIcon);
    setSelectedParent(currentParent || null);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !categoryName.trim()) return;

    // Validate hierarchy
    if (
      !validateCategoryHierarchy(
        computedCategories,
        editingCategory,
        selectedParent || undefined,
      )
    ) {
      Alert.alert(
        t("budgetingCategories.invalidHierarchy"),
        t("budgetingCategories.subcategoryCannotBeChild"),
      );
      return;
    }

    setLoading(true);
    try {
      const newOverrides = { ...currentOverrides };

      // Check if it's a base category being edited
      const baseCategory = BASE_EXPENSE_CATEGORIES.find(
        (cat) => cat.id === editingCategory,
      );
      if (baseCategory) {
        newOverrides.edited[editingCategory] = {
          name: categoryName.trim(),
          icon: categoryIcon,
          parent: selectedParent || undefined,
        };
      } else {
        // It's a custom category, update it in the added array
        const addedIndex = newOverrides.added.findIndex(
          (cat) => cat.id === editingCategory,
        );
        if (addedIndex !== -1) {
          newOverrides.added[addedIndex] = {
            ...newOverrides.added[addedIndex],
            name: categoryName.trim(),
            icon: categoryIcon,
            parent: selectedParent || undefined,
          };
        }
      }

      await updateProfile({
        budgeting: {
          ...userProfile?.profile?.budgeting,
          categoryOverrides: newOverrides,
        },
      });

      setEditingCategory(null);
      setCategoryName("");
      setCategoryIcon("📋");
      setSelectedParent(null);
    } catch (error) {
      console.error("Failed to update category:", (error as Error).message);
      Alert.alert(
        t("budgetingCategories.error"),
        t("budgetingCategories.updateCategoryFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;

    // Validate hierarchy
    if (
      !validateCategoryHierarchy(
        computedCategories,
        `custom_${Date.now()}`,
        selectedParent || undefined,
      )
    ) {
      Alert.alert(
        t("budgetingCategories.invalidHierarchy"),
        t("budgetingCategories.subcategoryCannotBeChild"),
      );
      return;
    }

    setLoading(true);
    try {
      const newOverrides = { ...currentOverrides };
      const newId = `custom_${Date.now()}`;

      newOverrides.added.push({
        id: newId,
        name: categoryName.trim(),
        icon: categoryIcon,
        parent: selectedParent || undefined,
      });

      await updateProfile({
        budgeting: {
          ...userProfile?.profile?.budgeting,
          categoryOverrides: newOverrides,
        },
      });

      setAddingCategory(false);
      setCategoryName("");
      setCategoryIcon("📋");
      setSelectedParent(null);
    } catch (error) {
      console.error("Failed to add category:", (error as Error).message);
      Alert.alert(
        t("budgetingCategories.error"),
        t("budgetingCategories.addCategoryFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    Alert.alert(
      t("budgetingCategories.deleteCategory"),
      t("budgetingCategories.deleteCategoryConfirm"),
      [
        { text: t("budgetingCategories.cancel"), style: "cancel" },
        {
          text: t("budgetingCategories.delete"),
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const newOverrides = { ...currentOverrides };

              // Check if it's a base category
              const baseCategory = BASE_EXPENSE_CATEGORIES.find(
                (cat) => cat.id === categoryId,
              );
              if (baseCategory) {
                if (!newOverrides.deleted.includes(categoryId)) {
                  newOverrides.deleted.push(categoryId);
                }
                // Remove from edited if it was edited
                delete newOverrides.edited[categoryId];
              } else {
                // Remove from added array
                newOverrides.added = newOverrides.added.filter(
                  (cat) => cat.id !== categoryId,
                );
              }

              await updateProfile({
                budgeting: {
                  ...userProfile?.profile?.budgeting,
                  categoryOverrides: newOverrides,
                },
              });
            } catch (error) {
              console.error(
                "Failed to delete category:",
                (error as Error).message,
              );
              Alert.alert(
                t("budgetingCategories.error"),
                t("budgetingCategories.deleteCategoryFailed"),
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleRestoreCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      const newOverrides = { ...currentOverrides };
      newOverrides.deleted = newOverrides.deleted.filter(
        (id) => id !== categoryId,
      );
      // Also remove any edits for this category since we're restoring
      delete newOverrides.edited[categoryId];

      await updateProfile({
        budgeting: {
          ...userProfile?.profile?.budgeting,
          categoryOverrides: newOverrides,
        },
      });
    } catch (error) {
      console.error("Failed to restore category:", (error as Error).message);
      Alert.alert(
        t("budgetingCategories.error"),
        t("budgetingCategories.restoreCategoryFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.icon} />
    </TouchableOpacity>
  );

  const renderParentSelector = () => {
    const availableParents = mainCategories.filter(
      (cat) => cat.id !== editingCategory, // Can't be parent of itself
    );

    const selectedIndex = selectedParent
      ? new IndexPath(
          availableParents.findIndex((cat) => cat.id === selectedParent),
        )
      : undefined;

    return (
      <View style={styles.parentSelector}>
        <Select
          label={t("budgetingCategories.parentCategory")}
          placeholder={t("budgetingCategories.parentCategoryDescription")}
          value={
            selectedParent
              ? availableParents.find((cat) => cat.id === selectedParent)?.name
              : ""
          }
          selectedIndex={selectedIndex}
          onSelect={(index) => {
            if (Array.isArray(index)) return;
            const selectedCategory = availableParents[index.row];
            setSelectedParent(selectedCategory ? selectedCategory.id : null);
          }}
          style={styles.parentSelect}
        >
          {availableParents.map((category) => (
            <SelectItem
              key={category.id}
              title={`${category.icon} ${category.name}`}
            />
          ))}
        </Select>
        {selectedParent && (
          <TouchableOpacity
            style={[
              styles.clearParentButton,
              { backgroundColor: colors.error + "20" },
            ]}
            onPress={() => setSelectedParent(null)}
          >
            <Text style={[styles.clearParentText, { color: colors.error }]}>
              {t("budgetingCategories.clearParent")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmojiPicker = () => (
    <View style={styles.emojiPicker}>
      <Text style={[styles.emojiLabel, { color: colors.text }]}>
        {t("budgetingCategories.selectIcon")}
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
                  categoryIcon === emoji
                    ? colors.primary + "20"
                    : colors.border,
              },
              {
                borderColor:
                  categoryIcon === emoji ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setCategoryIcon(emoji)}
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
        title={t("budgetingCategories.title")}
        alignment="center"
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Categories */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("budgetingCategories.activeCategories")}
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setAddingCategory(true)}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {mainCategories.map((category) => (
            <View key={category.id}>
              {/* Main Category */}
              <View style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {category.name}
                  </Text>
                  {currentOverrides.edited[category.id] && (
                    <View
                      style={[
                        styles.modifiedBadge,
                        { backgroundColor: colors.warning + "20" },
                      ]}
                    >
                      <Text
                        style={[styles.modifiedText, { color: colors.warning }]}
                      >
                        {t("budgetingCategories.modified")}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                    onPress={() =>
                      handleEditCategory(
                        category.id,
                        category.name,
                        category.icon,
                        category.parent,
                      )
                    }
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.error + "20" },
                    ]}
                    onPress={() => handleDeleteCategory(category.id)}
                  >
                    <Ionicons name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Subcategories */}
              {getSubcategories(computedCategories, category.id).map(
                (subcategory) => (
                  <View
                    key={subcategory.id}
                    style={[styles.categoryRow, styles.subcategoryRow]}
                  >
                    <View style={styles.categoryInfo}>
                      <View style={styles.subcategoryIndent}>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color={colors.icon}
                        />
                      </View>
                      <Text style={styles.categoryIcon}>
                        {subcategory.icon}
                      </Text>
                      <Text
                        style={[styles.categoryName, { color: colors.text }]}
                      >
                        {subcategory.name}
                      </Text>
                      {currentOverrides.edited[subcategory.id] && (
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
                            {t("budgetingCategories.modified")}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.categoryActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: colors.primary + "20" },
                        ]}
                        onPress={() =>
                          handleEditCategory(
                            subcategory.id,
                            subcategory.name,
                            subcategory.icon,
                            subcategory.parent,
                          )
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
                          styles.actionButton,
                          { backgroundColor: colors.error + "20" },
                        ]}
                        onPress={() => handleDeleteCategory(subcategory.id)}
                      >
                        <Ionicons name="trash" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ),
              )}
            </View>
          ))}
        </View>

        {/* Deleted Categories */}
        {currentOverrides.deleted.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, shadowColor: colors.text },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("budgetingCategories.deletedCategories")}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.icon }]}>
              {t("budgetingCategories.deletedCategoriesDescription")}
            </Text>

            {currentOverrides.deleted.map((categoryId) => {
              const baseCategory = BASE_EXPENSE_CATEGORIES.find(
                (cat) => cat.id === categoryId,
              );
              if (!baseCategory) return null;

              return (
                <View
                  key={categoryId}
                  style={[styles.categoryRow, { opacity: 0.6 }]}
                >
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryIcon}>{baseCategory.icon}</Text>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                      {baseCategory.name}
                    </Text>
                    <View
                      style={[
                        styles.deletedBadge,
                        { backgroundColor: colors.error + "20" },
                      ]}
                    >
                      <Text
                        style={[styles.deletedText, { color: colors.error }]}
                      >
                        {t("budgetingCategories.deleted")}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.restoreButton,
                      { backgroundColor: colors.success + "20" },
                    ]}
                    onPress={() => handleRestoreCategory(categoryId)}
                  >
                    <Ionicons name="refresh" size={16} color={colors.success} />
                    <Text
                      style={[styles.restoreText, { color: colors.success }]}
                    >
                      {t("budgetingCategories.restore")}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Category Modal */}
      <Modal
        visible={!!editingCategory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingCategory(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("budgetingCategories.editCategory")}
            </Text>

            <Input
              label={t("budgetingCategories.categoryName")}
              value={categoryName}
              onChangeText={setCategoryName}
              style={styles.modalInput}
            />

            {renderParentSelector()}

            {renderEmojiPicker()}

            <View style={styles.modalActions}>
              <Button
                style={styles.modalButton}
                appearance="outline"
                onPress={() => setEditingCategory(null)}
              >
                {t("budgetingCategories.cancel")}
              </Button>
              <Button
                style={styles.modalButton}
                onPress={handleSaveEdit}
                disabled={loading || !categoryName.trim()}
                accessoryLeft={
                  loading
                    ? () => <Spinner size="small" status="control" />
                    : undefined
                }
              >
                {loading
                  ? t("budgetingCategories.saving")
                  : t("budgetingCategories.save")}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={addingCategory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddingCategory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("budgetingCategories.addNewCategory")}
            </Text>

            <Input
              label={t("budgetingCategories.categoryName")}
              value={categoryName}
              onChangeText={setCategoryName}
              style={styles.modalInput}
            />

            {renderParentSelector()}

            {renderEmojiPicker()}

            <View style={styles.modalActions}>
              <Button
                style={styles.modalButton}
                appearance="outline"
                onPress={() => setAddingCategory(false)}
              >
                {t("budgetingCategories.cancel")}
              </Button>
              <Button
                style={styles.modalButton}
                onPress={handleAddCategory}
                disabled={loading || !categoryName.trim()}
                accessoryLeft={
                  loading
                    ? () => <Spinner size="small" status="control" />
                    : undefined
                }
              >
                {loading
                  ? t("budgetingCategories.adding")
                  : t("budgetingCategories.add")}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 16,
    lineHeight: 20,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  modifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  modifiedText: {
    fontSize: 10,
    fontWeight: "600",
  },
  deletedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  deletedText: {
    fontSize: 10,
    fontWeight: "600",
  },
  categoryActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  restoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    marginBottom: 20,
  },
  emojiPicker: {
    marginBottom: 20,
  },
  emojiLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  emojiScroll: {
    maxHeight: 60,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 1,
  },
  emojiText: {
    fontSize: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  subcategoryRow: {
    paddingLeft: 20,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
  },
  subcategoryIndent: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  parentSelector: {
    marginBottom: 20,
  },
  parentSelect: {
    marginBottom: 8,
  },
  clearParentButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearParentText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
