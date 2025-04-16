# Используем официальный образ Node.js 20
FROM node:20

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm i

# Копируем остальные исходные файлы
COPY .. .

ENV NODE_ENV=production

# Указываем команду для запуска бота
CMD [ "node", "index.js" ]
