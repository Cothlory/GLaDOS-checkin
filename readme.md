# Checkin

GitHub Actions 实现 [GLaDOS][glados] 自动签到

([GLaDOS][glados] 可用邀请码: `MW4DK-O0RSF-C7AOU-EN1MP`, 双方都有奖励天数)

## 使用说明

1. Fork 这个仓库

1. 登录 [GLaDOS 控制台](https://glados.cloud/console/checkin)，获取当前会话的 Cookie。确保包含 `gld:sess` 和配套的 `gld:sess.sig`。

1. 添加 Cookie 到 Secret `GLADOS`

1. 将同一登录浏览器的 User-Agent 添加到 Secret `GLADOS_UA`。多个浏览器分别登录时，按 `GLADOS` 的账号顺序逐行填写。

1. 启用 Actions, 每天北京时间 00:10 自动签到

## 高级功能

1. 如有多个帐号, 可以写为多行 Secret `GLADOS`, 每行写一个 Cookie

1. 如需修改时间, 可以修改文件 [build.yml](.github/workflows/build.yml#L5) 中的 `cron` 参数, 格式可参考 [crontab]

1. 若日志提示需要 Cloudflare 验证，请到 GLaDOS 控制台完成验证和签到。

1. 如需推送通知, 可配置 Secret `NOTIFY`, 已支持:
    1. [WxPusher][wxpusher]: 格式 `wxpusher:{token}:{uid}`
    1. [PushPlus][pushplus]: 格式 `pushplus:{token}`
    1. [Bark][bark]: 格式 `bark:{key}`
    1. [企业微信][qyweixin]: 格式 `qyweixin:{key}`
    1. Console: 格式 `console:log`, 作为日志输出, 一般用于调试
    1. 如需配置多个, 可以写为多行, 每行写一个

1. 注意: Cookie 以及接口输出数据, 包含帐号敏感信息, 因此不要随意公开

---

[glados]: https://github.com/glados-network/GLaDOS
[crontab]: https://crontab.guru/
[pushplus]: https://www.pushplus.plus/
[wxpusher]: https://wxpusher.zjiecode.com/
[bark]: https://github.com/Finb/Bark
[qyweixin]: https://developer.work.weixin.qq.com/document/path/91770
