import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../constants/theme';
import GlassContainer from './GlassContainer';
import useAppStore from '../store/appStore';

interface ChatModalProps {
    visible: boolean;
    rideId: string;
    onClose: () => void;
    otherPartyName: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ visible, rideId, onClose, otherPartyName }) => {
    const { user } = useAppStore();
    const [messages, setMessages] = React.useState<any[]>([]);
    const [inputText, setInputText] = React.useState('');

    const fetchMessages = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/chats/${rideId}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Fetch messages failed:', error);
        }
    };

    React.useEffect(() => {
        if (visible && rideId) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [visible, rideId]);

    const handleSend = async () => {
        if (!inputText.trim() || !user) return;

        try {
            const response = await fetch('http://127.0.0.1:8000/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ride_id: rideId,
                    sender_id: user.id,
                    sender_name: user.name,
                    text: inputText.trim()
                })
            });
            if (response.ok) {
                setInputText('');
                fetchMessages();
            }
        } catch (error) {
            console.error('Send message failed:', error);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalBackground}>
                <GlassContainer style={styles.chatContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Chat with {otherPartyName}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.messageList} contentContainerStyle={styles.listContent}>
                        {messages.map((msg) => (
                            <View
                                key={msg.id}
                                style={[
                                    styles.messageBubble,
                                    msg.sender_id === user?.id ? styles.myMessage : styles.theirMessage
                                ]}
                            >
                                <Text style={styles.messageText}>{msg.text}</Text>
                                <Text style={styles.timeText}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                    >
                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.input}
                                placeholder="Type a message..."
                                placeholderTextColor={COLORS.whiteAlpha40}
                                value={inputText}
                                onChangeText={setInputText}
                            />
                            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                <Ionicons name="send" size={20} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </GlassContainer>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    chatContainer: {
        height: '80%',
        padding: SPACING.md,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardStroke,
    },
    headerTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    messageList: {
        flex: 1,
        marginVertical: SPACING.md,
    },
    listContent: {
        paddingBottom: SPACING.md,
    },
    messageBubble: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        maxWidth: '80%',
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.blue,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.slate700,
    },
    messageText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.md,
    },
    timeText: {
        color: COLORS.whiteAlpha60,
        fontSize: 10,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingTop: SPACING.sm,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.slate900,
        borderRadius: BORDER_RADIUS.pill,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        color: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.cardStroke,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChatModal;
