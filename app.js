require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')
const { response } = require('express')

const schedule = require('node-schedule')

const url = 'https://api.telegram.org/bot' + process.env.TOKEN

var lastChatId = 0

getTextMessage = (req) => {
    if (req.body.message.text && req.body.message.chat.id) {
        let message = {
            text: req.body.message.text,
            chatId: req.body.message.chat.id
        }
        return message
    }
    else return null
}

sendMessage = async (chatId, text) => {
    await axios.get(url + '/sendMessage', {
        params: {
            chatId: chatId,
            text: text
        }
    })
}

sendWelcomeMessage = async (chatId) => {
    let text = 'Hi! This is the NUS Temperature Reminder Bot. The link https://myaces.nus.edu.sg/htd/htd will be sent at 830am and 1pm daily.'
    await sendMessage(chatId, text)
}

sendReminderMessage = async (chatId) => {
    let text = 'Remember to take your temperature! https://myaces.nus.edu.sg/htd/htd'
    await sendMessage(chatId, text)
}

manageMessage = async (req, res) => {
    let message = await getTextMessage(req)
    if (message) {
        if (message.text == '/start') sendWelcomeMessage(message.chatId)
    }
    lastChatId = message.chatId
    res.sendStatus(200)
}

const job = schedule.scheduleJob('0 11 * * *', () => {
    sendReminderMessage(lastChatId)
}) 

app.get('/', (req, res) => {
    res.send('NUS Temperature Reminder Bot, webhook added')
})

app.post('/' + process.env.TOKEN, (req, res) => {
    manageMessage(req, res)
})

app.listen(process.env.PORT, () => {
    console.log('Server started')
})