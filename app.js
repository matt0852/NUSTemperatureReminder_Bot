require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')
const { response } = require('express')

const url = 'https://api.telegram.org/bot' + process.env.TOKEN

getTextMessage = async (req) => {
    let text = await req.body.message.text
    let chat_id = await req.body.message.chat.id
    let message = {
        text: text,
        chat_id: chat_id
    }
    return message
}

sendMessage = async (message) => {
    await axios.get(url + '/sendMessage', {
        params: {
            chat_id: message.chat_id,
            text: message.text
        }
    })
}

app.get('/', (req, res) => {
    res.send('NUS Temperature Reminder Bot, webhook added')
})

app.post('/' + process.env.TOKEN, (req, res) => {
    getTextMessage(req, (message) => {
        return sendMessage(message)
    }).then(() => {
        res.sendStatus(200)
    }).catch(() => {
        console.log('error')
        res.sendStatus(200)
    })
})

app.listen(process.env.PORT, () => {
    console.log('Server started')
})