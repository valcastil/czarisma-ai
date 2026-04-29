-- Fix: When message is created with is_read=true (recipient in chat), don't increment unread_count

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update conversation for sender
    INSERT INTO public.conversations (
        user_id,
        participant_id,
        last_message_id,
        last_message_content,
        last_message_timestamp,
        last_message_sender_id,
        unread_count
    ) VALUES (
        NEW.sender_id,
        NEW.receiver_id,
        NEW.id,
        NEW.content,
        NEW.created_at,
        NEW.sender_id,
        0
    )
    ON CONFLICT (user_id, participant_id)
    DO UPDATE SET
        last_message_id = NEW.id,
        last_message_content = NEW.content,
        last_message_timestamp = NEW.created_at,
        last_message_sender_id = NEW.sender_id,
        updated_at = NOW();
    
    -- Update conversation for receiver
    -- Only increment unread_count if message is NOT already read (recipient not in chat)
    INSERT INTO public.conversations (
        user_id,
        participant_id,
        last_message_id,
        last_message_content,
        last_message_timestamp,
        last_message_sender_id,
        unread_count
    ) VALUES (
        NEW.receiver_id,
        NEW.sender_id,
        NEW.id,
        NEW.content,
        NEW.created_at,
        NEW.sender_id,
        CASE WHEN NEW.is_read = true THEN 0 ELSE 1 END
    )
    ON CONFLICT (user_id, participant_id)
    DO UPDATE SET
        last_message_id = NEW.id,
        last_message_content = NEW.content,
        last_message_timestamp = NEW.created_at,
        last_message_sender_id = NEW.sender_id,
        unread_count = CASE 
            WHEN NEW.is_read = true THEN public.conversations.unread_count
            ELSE public.conversations.unread_count + 1
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_conversation_on_message() IS 'Updates conversations when new message is sent. Handles pre-read messages (recipient in chat) by not incrementing unread_count.';
