export const formatMessageTime = (timestamp) => {
  const messageDate = new Date(timestamp)
  const today = new Date()
  const isToday = messageDate.toDateString() === today.toDateString()
  
  const hours = messageDate.getHours().toString().padStart(2, '0')
  const minutes = messageDate.getMinutes().toString().padStart(2, '0')
  const time = `${hours}:${minutes}`
  
  if (isToday) {
    return time
  } else {
    const year = messageDate.getFullYear()
    const month = (messageDate.getMonth() + 1).toString().padStart(2, '0')
    const day = messageDate.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${time}`
  }
} 