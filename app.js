require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const axios = require('axios')

const url = 'https://api.telegram.org/bot' + process.env.TOKEN

sendMessage = async (chat_id, text) => {
    await axios.get(url + '/sendMessage', {
        params: {
            chat_id: chat_id,
            text: text
        }
    })
}

app.get('/', (req, res) => {
    sendMessage(841581825, 'Hello').then(() => {
        console.log('Message sent')
        res.send('NUS Temperature Reminder Bot')
    })
})

app.post('/' + process.env.TOKEN, (req, res) => {
    res.send(req.body)
})

app.listen(process.env.PORT, () => {
    console.log('Server started')
})