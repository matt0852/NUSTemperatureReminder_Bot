require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')
const { response } = require('express')

const schedule = require('node-schedule')

const url = 'https://api.telegram.org/bot' + process.env.TOKEN

var lastchat_id = 0

getTextMessage = (req) => {
    if (req.body.message.text && req.body.message.chat.id) {
        let message = {
            text: req.body.message.text,
            chat_id: req.body.message.chat.id
        }
        return message
    }
    else return null
}

sendMessage = async (chat_id, text) => {
    await axios.get(url + '/sendMessage', {
        params: {
            chat_id: chat_id,
            text: text
        }
    })
}

sendWelcomeMessage = async (chat_id) => {
    let text = 'Hi! This is the NUS Temperature Reminder Bot. Your link will be sent at 8am and 1pm daily.'
    await sendMessage(chat_id, text)
}

sendReminderMessage = async (chat_id) => {
    let text = 'Remember to take your temperature! https://myaces.nus.edu.sg/htd/htd'
    await sendMessage(chat_id, text)
}

manageMessage = async (req, res) => {
    let message = await getTextMessage(req)
    if (message) {
        if (message.text == '/start') sendWelcomeMessage(message.chat_id)
    }
    lastchat_id = message.chat_id
    res.sendStatus(200)
}

const job = schedule.scheduleJob('0 8 * * *', () => {
    sendReminderMessage(lastchat_id)
}) 

const secondJob = schedule.scheduleJob('0 13 * * *', () => {
    sendReminderMessage(lastchat_id)
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