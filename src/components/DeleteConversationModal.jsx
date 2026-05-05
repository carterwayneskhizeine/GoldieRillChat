import React from 'react'
import { deleteConversation } from './conversationDeleteHandlers'

export default function DeleteConversationModal({
  deletingConversation,
  setDeletingConversation,
  conversations,
  currentConversation,
  setConversations,
  setCurrentConversation,
  setMessages,
}) {
  if (!deletingConversation) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Delete Chat</h3>
        <p className="py-4">Are you sure you want to delete this chat?</p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => setDeletingConversation(null)}>
            No
          </button>
          <button
            className="btn btn-error"
            onClick={() => {
              deleteConversation(
                deletingConversation.id,
                conversations,
                currentConversation,
                setConversations,
                setCurrentConversation,
                setMessages,
                window
              )
              setDeletingConversation(null)
            }}
          >
            Yes
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={() => setDeletingConversation(null)}></div>
    </div>
  )
}
