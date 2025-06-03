import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';

interface ProfileHeaderProps {
    style?: any;
}

export default function ProfileHeader({ style }: ProfileHeaderProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { userProfile } = useProfile();

    const getGravatarUrl = (email: string, size: number = 32) => {
        // Using a placeholder hash calculation for now
        // In production, you'd compute the proper MD5 hash
        const placeholderHash = email.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0).toString(16);

        return `https://www.gravatar.com/avatar/${placeholderHash}?s=${size}&d=identicon`;
    };

    const handlePress = () => {
        router.push('/(protected)/profile');
    };

    if (!user || !userProfile) {
        return null;
    }

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: getGravatarUrl(user.email || '') }}
                style={styles.avatar}
            />
            <Text category='s2' style={styles.username}>
                {userProfile.username}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        backgroundColor: '#F0F0F0',
    },
    username: {
        fontWeight: '500',
        color: '#8F9BB3',
    },
});
