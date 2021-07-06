require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')
const { response } = require('express')

const url = 'https://api.telegram.org/bot' + process.env.TOKEN

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

sendMessage = async (message) => {
    await axios.get(url + '/sendMessage', {
        params: {
            chat_id: message.chat_id,
            text: message.text
        }
    })
}

manageMessage = async (req, res) => {
    let message = await getTextMessage(req)
    if (message) {
        if (message.text == '/start') {
            let reply = {
                chat_id = message.chat_id,
                text = 'Hi! This is the NUS Temperature Reminder Bot. The link https://myaces.nus.edu.sg/htd/htd will be sent at 830am and 1pm daily.'
            }
            await sendMessage(reply)
        }
    }
    res.sendStatus(200)
}

app.get('/', (req, res) => {
    res.send('NUS Temperature Reminder Bot, webhook added')
})

app.post('/' + process.env.TOKEN, (req, res) => {
    manageMessage(req, res)
})

app.listen(process.env.PORT, () => {
    console.log('Server started')
})