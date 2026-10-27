# Oda ayarı (room config) sözleşmesi

Dev Room (ahmetbolukoglu.github.io) her açılışta odanın içeriğini tek bir JSON'dan okur. Projeler, sürümler,
monitör üstündeki 3 tablo, sağ duvar galerisi, çekmeceler, ekranlarda açılan uygulamalar ve televizyon bu
ayardan gelir. Ayar theyvoice.com panelinden düzenlenir; **site yeniden deploy edilmez**.

## Kaynaklar ve sıra

1. `localStorage["devroom-content"]`: son başarılı ayar (açılışta anında uygulanır, sonra tazelenir).
2. `GET https://theyvoice.com/api/portfolio` (canlı; panelden kaydedilen ayar + TheyVoice projeleri).
3. `content/room.json` (bu repodaki varsayılan; 1 ve 2 yoksa).

Site sayfa görünürken birkaç dakikada bir ve sekmeye geri dönüldüğünde ayarı yeniden okur; değişen her şey
sayfa yenilenmeden yerine oturur.

## `GET https://theyvoice.com/api/portfolio`

- Herkese açık, salt okunur. `Access-Control-Allow-Origin: *`, `Cache-Control: public, s-maxage=60, stale-while-revalidate=600`.
- Görseller (Supabase media bucket) CORS açık olmalı; 3D sahne onları WebGL dokusu olarak yükler.

```json
{
  "updatedAt": "2026-10-27T10:00:00Z",
  "room": { "...": "aşağıdaki oda ayarı (panelde kaydedilen JSON)" },
  "projects": [
    {
      "slug": "mafia-gun", "kind": "game", "title": "Mafia Gun",
      "tagline": "Mafya temalı, gerçek zamanlı 1v1 kart ve bina savaşı.",
      "description": "…", "status": "beta",
      "accent": "#FF3D77", "cover_url": "https://…", "icon_url": "https://…", "logo_url": "https://…",
      "screenshots": ["https://…"], "platforms": ["web", "android", "ios"],
      "links": { "web": "https://mafiagun.com" }, "released_at": "2026-10-24",
      "latest": { "version": "0.1.2", "title": "TheyVoice ID ve arkadaşlar", "published_at": "2026-10-25" },
      "url": "https://theyvoice.com/games/mafia-gun"
    }
  ],
  "news": [{ "title": "…", "url": "https://theyvoice.com/news/…", "published_at": "…", "project": "mafia-gun" }]
}
```

`projects`: theyvoice.com'da yayımlanmış (published) bütün projeler, en son sürümleriyle. Oda ayarı bunlara
`"theyvoice:<slug>"` ile başvurur; böylece oyun publish API'sine yeni sürüm gönderdiğinde portfolyo da kendiliğinden günceller.

## Oda ayarı (`room`)

```json
{
  "version": 1,
  "status": "yeni projelere açık",
  "neon": "çay · kod · tekrar",

  "projects": [
    { "ref": "theyvoice:mafia-gun" },
    { "ref": "github:ahmetbolukoglu/ahmetbolukoglu.github.io", "name": "Dev Room", "type": "Portfolyo · 3D oda" },
    { "name": "TheyVoice", "status": "Yayında", "type": "Stüdyo sitesi", "desc": "…", "cover": "https://…", "icon": "https://…",
      "tech": ["Next.js"], "shots": [], "links": [["theyvoice.com", "https://theyvoice.com"]] },
    { "soon": true, "name": "Proje 04" }
  ],

  "featured": {
    "center": { "image": "https://…/poster.jpg", "title": "Mafia Gun", "project": "theyvoice:mafia-gun", "link": "https://mafiagun.com" },
    "left":   { "image": "https://…", "title": "…" },
    "right":  { "soon": true }
  },
  "gallery": [ { "image": "https://…", "title": "Eski oyunum", "link": "https://…" }, { "soon": true } ],

  "drawers": {
    "projects": "Drawer",
    "items": {
      "Drawer_L0": { "soon": true },
      "Drawer_L1": { "title": "Sertifikalar", "text": "…", "image": "https://…", "link": "https://…" }
    }
  },

  "screens": {
    "imac":   { "mode": "os", "apps": ["hakkimda", "ordek", "yetenekler", "hizmet", "player", "terminal", "cv", "archive", "iletisim"] },
    "tablet": { "mode": "os", "apps": ["cv", "hakkimda", "hizmet", "archive", "iletisim", "mail"] },
    "phone":  { "mode": "os", "apps": ["mail", "github", "linkedin", "cv", "terminal", "hakkimda", "yetenekler", "hizmet", "ordek", "player", "archive"] },
    "watch":  { "mode": "os", "apps": ["bildirim", "nabiz", "adim", "hava", "takvim", "muzik"] }
  },
  "customApps": [
    { "key": "unity", "label": "Unity demo", "icon": "🎮", "color": "#7c3aed", "title": "…", "text": "…", "image": "https://…", "link": "https://…" }
  ],

  "tv": {
    "mode": "gameplay",
    "title": "Mafia Gun · oynanış",
    "slides": [ { "image": "https://…/03-savas.jpg", "caption": "Baron Binası'nı düşür" } ]
  }
}
```

### Alanlar

| Alan | Açıklama |
| --- | --- |
| `status` | Girişteki yeşil rozet (ör. "yeni projelere açık"). Boşsa gizlenir. |
| `neon` | Duvardaki neon tabelanın yazısı. |
| `projects` | Projeler çekmecesindeki dosyalar, **bu sırayla**. Ekle, çıkar, sırala. Her öğe: `ref` (TheyVoice ya da GitHub'dan canlı), ya da elle yazılmış proje, ya da `{ "soon": true }`. `ref` olan öğede düz alanlar yalnız canlı veri gelmezse kullanılır; canlı veriyi ezmek için `"override": { ... }`. Proje alanları: `name`, `status`, `type`, `release`, `platforms`, `desc`, `tech[]`, `cover`, `icon`, `logo` (true: kapak bir logo, kırpılmasın), `shots[]`, `links[[etiket, url]]`, `accent`. |
| `featured` | Monitörün üstündeki 3 tablo: `center` büyük, `left` / `right` biraz küçük. `image` (dikey poster önerilir: 3:4 ya da 1200×1660), `title`, tıklayınca `project` (çekmecede o dosya açılır) ya da `link`. `{ "soon": true }` coming soon yazar. |
| `gallery` | Sağ duvardaki 9 çerçeve (sırayla, en çok 9). Aynı biçim. Eksikler coming soon. |
| `drawers.projects` | Projelerin hangi çekmecede olduğu: `Drawer` (sağ üst), `Drawer_R0`, `Drawer_R1`, `Drawer_L0`, `Drawer_L1`, `Drawer_L2`. |
| `drawers.items` | Diğer çekmecelerin içeriği: `{ "soon": true }` ya da `title` / `text` / `image` / `link`. Yazılmayan çekmece coming soon. |
| `screens.<cihaz>.mode` | `os`: işletim sistemi ana ekranı (uygulamalar); `showcase`: tam ekran sergi (`slides` + `title`). |
| `screens.<cihaz>.apps` | Ana ekrandaki uygulamalar ve sırası. Hazır anahtarlar: `hakkimda`, `yetenekler`, `terminal`, `cv`, `archive` (projeler), `iletisim`, `mail`, `github`, `linkedin`, `hizmet`, `ordek`, `player`; saat: `bildirim`, `nabiz`, `adim`, `hava`, `takvim`, `muzik`. Ayrıca `customApps` anahtarları. |
| `customApps` | Panelden eklenen sayfa uygulamaları (başlık, metin, görsel, bağlantı). |
| `tv.mode` | `gameplay`: görsellerden canlı yayın gibi akan oynanış (yavaş yakınlaşma ve kaydırma, geçişler, alt yazı, CANLI rozeti); `marquee`: çalıştığım yerler şeridi. |
| `tv.featured` | TV açılınca seçili oyun (`theyvoice:<slug>`). |
| `watching` | TV'deki "İzliyorum" sekmesi: `[{ title, service: netflix|prime|appletv|disney|youtube|other, status: watching|watched|watchlist, poster, link, year, note, progress }]`. Servislerin açık API'si olmadığı için panelden yönetilir. |
| `projects[].videos` | TheyVoice projelerinin videoları (YouTube; ileride mp4/Vimeo) TV'nin medya rafında oynar. |
| `tv.slides` | Oynanış görselleri ve alt yazıları. Boşsa `tv.project` ya da ilk projenin ekran görüntüleri kullanılır. |

Bilinmeyen alanlar yok sayılır; eksik alanlarda site varsayılanı kullanır. Görsel adresleri https olmalı.
