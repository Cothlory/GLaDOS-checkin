const origin = 'https://glados.cloud'
const sessionCookie = /(?:^|;)\s*gld[:_]sess=[^;\s]+/
const sessionSignature = /(?:^|;)\s*gld[:_]sess\.sig=[^;\s]+/
const splitLines = (value) => (value ?? '').split(/\r?\n/).map((line) => line.trim())
const checkinPattern = /check[\s_-]*in|签到/i
const checkinDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', dateStyle: 'short' })

const isFromDay = (entry, day) => {
  const raw = entry?.time ?? entry?.createdAt ?? entry?.created_at ?? entry?.date
  if (raw == null) return false
  const value = typeof raw === 'string' && /^\d{10,13}$/.test(raw) ? Number(raw) : raw
  const timestamp = typeof value === 'number'
    ? (value < 1e12 ? value * 1000 : value)
    : Date.parse(value)
  return Number.isFinite(timestamp) && checkinDay.format(timestamp) === day
}

const gladosRequest = async (path, label, options) => {
  let response
  try {
    response = await fetch(`${origin}${path}`, {
      ...options,
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error(`${label}请求失败，请检查网络连接`)
  }
  if (response.headers.get('cf-mitigated') === 'challenge') {
    throw new Error(`${label}需要在 GLaDOS 官网完成 Cloudflare 验证`)
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(`${label}未获授权（HTTP ${response.status}），请检查登录会话`)
  }
  if (!response.ok) throw new Error(`${label}请求失败（HTTP ${response.status}）`)

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(`${label}接口未返回 JSON`)
  }
  if (result?.reason === 'turnstile') {
    throw new Error(`${label}需要在 GLaDOS 官网完成 Cloudflare 验证`)
  }
  if (result?.reason === 'device-mismatch') {
    throw new Error(`${label}设备校验失败，请从同一登录会话更新 GLADOS 和 GLADOS_UA`)
  }
  if (result?.code === -2 || result?.message === '没有权限') {
    throw new Error(`${label}会话未获授权，请从同一登录会话更新 GLADOS 和 GLADOS_UA`)
  }
  return result
}

const glados = async () => {
  const notice = []
  const cookies = splitLines(process.env.GLADOS)
  const userAgents = splitLines(process.env.GLADOS_UA)
  if (!cookies.some(Boolean)) {
    process.exitCode = 1
    console.error('未配置 GLADOS，无法签到')
    return ['Checkin Error', '未配置 GLADOS，无法签到']
  }

  let account = 0
  for (const [index, cookie] of cookies.entries()) {
    if (!cookie) continue
    account += 1
    try {
      if (!sessionCookie.test(cookie) || !sessionSignature.test(cookie)) {
        throw new Error('GLADOS 缺少新版会话字段 gld:sess 或 gld:sess.sig，请重新登录后更新')
      }
      const headers = { cookie, referer: `${origin}/console/checkin` }
      const userAgent = userAgents.length === 1 ? userAgents[0] : userAgents[index]
      if (userAgent) headers['user-agent'] = userAgent

      const status = await gladosRequest('/api/user/status', '登录状态', { headers })
      if (status?.code !== 0) throw new Error('GLaDOS 未确认登录状态')

      const day = checkinDay.format()
      const action = await gladosRequest('/api/user/checkin', '签到', {
        method: 'POST',
        headers: { ...headers, origin, 'content-type': 'application/json' },
        body: '{"token":"glados.cloud"}',
      })
      const alreadyCheckedIn = action?.code === 1
      if (alreadyCheckedIn) {
        const points = await gladosRequest('/api/user/points', '积分流水', { headers })
        const history = points?.history ?? points?.list
        if (points?.code !== 0 || !Array.isArray(history)) {
          throw new Error('签到返回 code=1，但无法读取积分流水确认结果')
        }
        const record = history.filter((entry) => isFromDay(entry, day))
        const hasCheckin = record.some((entry) =>
          [entry.reason, entry.type, entry.action, entry.operation, entry.description, entry.message]
            .some((field) => typeof field === 'string' && checkinPattern.test(field))
        )
        if (!hasCheckin) {
          const detail = record.length ? '当天积分记录中没有可确认的签到条目' : '当天没有积分记录'
          throw new Error(`签到返回 code=1，${detail}`)
        }
      } else if (action?.code !== 0) {
        const code = Number.isInteger(action?.code) ? `（code=${action.code}）` : ''
        throw new Error(`GLaDOS 未确认签到${code}`)
      }

      const result = `账号 ${account}：${alreadyCheckedIn ? '积分流水确认今日已签到' : '签到成功'}`
      console.log(result)
      notice.push('Checkin OK', result)
      const leftDays = Number(status?.data?.leftDays)
      if (Number.isFinite(leftDays)) notice.push(`签到请求前剩余 ${leftDays} 天`)
    } catch (error) {
      process.exitCode = 1
      const message = `账号 ${account}：${error.message}`
      console.error(message)
      notice.push(
        'Checkin Error',
        message,
        `<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`
      )
    }
  }
  return notice
}

const notify = async (notice) => {
  if (!process.env.NOTIFY || !notice) return
  for (const option of String(process.env.NOTIFY).split('\n')) {
    if (!option) continue
    try {
      if (option.startsWith('console:')) {
        for (const line of notice) {
          console.log(line)
        }
      } else if (option.startsWith('wxpusher:')) {
        await fetch(`https://wxpusher.zjiecode.com/api/send/message`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            appToken: option.split(':')[1],
            summary: notice[0],
            content: notice.join('<br>'),
            contentType: 3,
            uids: option.split(':').slice(2),
          }),
        })
      } else if (option.startsWith('pushplus:')) {
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option.split(':')[1],
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      } else if (option.startsWith('bark:')) {
        await fetch(`https://api.day.app/${option.split(':')[1]}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: notice[0],
            body: notice.slice(1).join('\n'),
          }),
        })
      } else if (option.startsWith('qyweixin:')) {
        const qyweixinToken = option.split(':')[1]
        const qyweixinNotifyRebotUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' + qyweixinToken;
        await fetch(qyweixinNotifyRebotUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
                content: notice.join('<br>')
            }
          }),
        })
      } else {
        // fallback
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option,
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      }
    } catch (error) {
      throw error
    }
  }
}

const main = async () => {
  await notify(await glados())
}

await main()
