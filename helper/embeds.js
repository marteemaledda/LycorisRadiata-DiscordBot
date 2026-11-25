import { EmbedBuilder } from "discord.js";

// Discord embed limits
const LIMITS = {
    title: 256,
    description: 4096,
    fieldName: 256,
    fieldValue: 1024,
    footerText: 2048,
    authorName: 256,
    fields: 25,
    total: 6000,
};

function textLen(value) {
    return typeof value === "string" ? value.length : 0;
}

function getFooter(footer) {
    if (!footer) return null;
    if (typeof footer === "string") {
        return footer.trim() ? { text: footer } : null;
    }
    if (typeof footer === "object") {
        const text = typeof footer.text === "string" ? footer.text : "";
        const iconURL = typeof footer.iconURL === "string" ? footer.iconURL : null;
        if (!text.trim() && !iconURL) return null;
        return { text, iconURL: iconURL || null };
    }
    return null;
}

function getFooterText(footer) {
    return getFooter(footer)?.text ?? "";
}

function getAuthor(author) {
    if (!author || typeof author !== "object") return null;
    const name = typeof author.name === "string" ? author.name : "";
    if (!name.trim()) return null;
    const url = typeof author.url === "string" && author.url.trim() ? author.url : null;
    const iconURL = typeof author.iconURL === "string" && author.iconURL.trim() ? author.iconURL : null;
    return { name, url, iconURL };
}

function getAuthorName(author) {
    return getAuthor(author)?.name ?? "";
}

function getUrlString(value) {
    if (!value) return null;
    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "object" && typeof value.url === "string") return value.url.trim() || null;
    return null;
}

function normalizeEmbedData(data = {}) {
    const normalized = { ...data };

    const footer = getFooter(data.footer);
    normalized.footer = footer ? { text: footer.text, iconURL: footer.iconURL ?? null } : null;

    const author = getAuthor(data.author);
    normalized.author = author ? { name: author.name, url: author.url ?? null, iconURL: author.iconURL ?? null } : null;

    const thumbnailUrl = getUrlString(data.thumbnail);
    normalized.thumbnail = thumbnailUrl ? { url: thumbnailUrl } : null;

    const imageUrl = getUrlString(data.image);
    normalized.image = imageUrl ? { url: imageUrl } : null;

    normalized.url = typeof data.url === "string" && data.url.trim() ? data.url.trim() : null;
    normalized.timestamp = data.timestamp ? data.timestamp : null;
    normalized.fields = Array.isArray(data.fields)
        ? data.fields.map((f) => ({
            name: typeof f?.name === "string" ? f.name : "",
            value: typeof f?.value === "string" ? f.value : "",
            inline: Boolean(f?.inline),
        }))
        : [];

    return normalized;
}

function getEmbedTotalLength(data = {}) {
    const d = normalizeEmbedData(data);
    let total = 0;
    total += textLen(d.title);
    total += textLen(d.description);
    total += textLen(getAuthorName(d.author));
    total += textLen(getFooterText(d.footer));
    for (const field of d.fields) {
        total += textLen(field?.name);
        total += textLen(field?.value);
    }
    return total;
}

function hasAnyContent(data = {}) {
    const d = normalizeEmbedData(data);
    if (textLen(d.title)) return true;
    if (textLen(d.url)) return true;
    if (textLen(d.description)) return true;
    if (textLen(getAuthorName(d.author))) return true;
    if (textLen(getFooterText(d.footer))) return true;
    if (d.thumbnail?.url) return true;
    if (d.image?.url) return true;
    if (d.timestamp) return true;
    if (Array.isArray(d.fields) && d.fields.length > 0) return true;
    return false;
}

function validateEmbedData(data = {}) {
    const d = normalizeEmbedData(data);
    const errors = [];

    if (textLen(d.title) > LIMITS.title) errors.push(`Title must be <= ${LIMITS.title} characters.`);
    if (textLen(d.description) > LIMITS.description) errors.push(`Description must be <= ${LIMITS.description} characters.`);
    if (textLen(getAuthorName(d.author)) > LIMITS.authorName) errors.push(`Author name must be <= ${LIMITS.authorName} characters.`);
    if (textLen(getFooterText(d.footer)) > LIMITS.footerText) errors.push(`Footer text must be <= ${LIMITS.footerText} characters.`);

    if (d.fields.length > LIMITS.fields) errors.push(`Embeds can have at most ${LIMITS.fields} fields.`);
    d.fields.forEach((field, i) => {
        if (textLen(field.name) > LIMITS.fieldName) errors.push(`Field ${i + 1} name must be <= ${LIMITS.fieldName} characters.`);
        if (textLen(field.value) > LIMITS.fieldValue) errors.push(`Field ${i + 1} value must be <= ${LIMITS.fieldValue} characters.`);
        if (!textLen(field.name)) errors.push(`Field ${i + 1} must have a name.`);
        if (!textLen(field.value)) errors.push(`Field ${i + 1} must have a value.`);
    });

    const total = getEmbedTotalLength(d);
    if (total > LIMITS.total) {
        errors.push(`Total embed text must be <= ${LIMITS.total} characters (currently ${total}).`);
    }

    return { ok: errors.length === 0, errors, total };
}

// function to update embed with new data
function createPreview(data = {}) {
    const d = normalizeEmbedData(data);
    const embed = new EmbedBuilder();

    if (d.title) embed.setTitle(d.title);
    if (isValidHttpUrl(d.url)) embed.setURL(d.url);
    if (d.description) embed.setDescription(d.description);
    if (d.color) embed.setColor(d.color);

    if (d.author?.name) {
        const author = { name: d.author.name };
        if (isValidHttpUrl(d.author.url)) author.url = d.author.url;
        if (isValidHttpUrl(d.author.iconURL)) author.iconURL = d.author.iconURL;
        embed.setAuthor(author);
    }

    if (d.footer?.text) {
        const footer = { text: d.footer.text };
        if (isValidHttpUrl(d.footer.iconURL)) footer.iconURL = d.footer.iconURL;
        embed.setFooter(footer);
    }

    if (isValidHttpUrl(d.thumbnail?.url)) embed.setThumbnail(d.thumbnail.url);
    if (isValidHttpUrl(d.image?.url)) embed.setImage(d.image.url);

    if (d.timestamp) {
        const date = new Date(d.timestamp);
        if (!Number.isNaN(date.getTime())) embed.setTimestamp(date);
    }

    if (d.fields.length > 0) {
        embed.addFields(d.fields.map((f) => ({ name: f.name, value: f.value, inline: Boolean(f.inline) })));
    }

    // Discord rejects completely empty embeds; keep a minimal placeholder for preview state.
    if (!hasAnyContent(d)) {
        embed.setDescription("\u200b");
    }

    return embed;
}

function createDefaultEmbedData(guildId, name) {
    return {
        guildId,
        name,
        title: "No Title",
        url: null,
        description: "No description yet.",
        color: null,
        author: null,      // { name, url, iconURL }
        footer: null,      // { text, iconURL }
        thumbnail: null,   // { url }
        image: null,       // { url }
        timestamp: null,
        fields: [],
        previewChannelId: null,
        previewMessageId: null,
    };
}

function replaceEmbedPlaceholders(value, context) {
    if (typeof value !== "string" || value.length === 0) return value;

    return value.replace(/\{(mention|user|username|displayname|globalname|tag|id|avatar|useravatar|serveravatar|guild|server|guildid|serverid|membercount)\}/gi, (match, key) => {
        const k = String(key).toLowerCase();
        switch (k) {
            case "mention":
            case "user":
                return context.mention;
            case "username":
                return context.username;
            case "displayname":
                return context.displayName;
            case "globalname":
                return context.globalName;
            case "tag":
                return context.tag;
            case "id":
                return context.id;
            case "avatar":
            case "useravatar":
                return context.avatar;
            case "serveravatar":
                return context.serverAvatar;
            case "guild":
            case "server":
                return context.guildName;
            case "guildid":
            case "serverid":
                return context.guildId;
            case "membercount":
                return context.memberCount;
            default:
                return match;
        }
    });
}

function buildWelcomeContext(member) {
    const user = member.user;
    return {
        mention: `<@${member.id}>`,
        username: user?.username ?? "",
        displayName: member.displayName ?? user?.globalName ?? user?.username ?? "",
        globalName: user?.globalName ?? user?.username ?? "",
        tag: user?.tag ?? user?.username ?? "",
        id: member.id ?? "",
        avatar: typeof user?.displayAvatarURL === "function" ? user.displayAvatarURL({ size: 256 }) : "",
        serverAvatar: typeof member.displayAvatarURL === "function" ? member.displayAvatarURL({ size: 256 }) : "",
        guildName: member.guild?.name ?? "",
        guildId: member.guild?.id ?? "",
        memberCount: String(member.guild?.memberCount ?? ""),
    };
}

function isValidHttpUrl(value) {
    if (typeof value !== "string") return false;
    try {
        const url = new URL(value.trim());
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function sanitizeEmbedUrl(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return isValidHttpUrl(trimmed) ? trimmed : null;
}

function renderWelcomeEmbedData(data = {}, member) {
    const d = normalizeEmbedData(data);
    const context = buildWelcomeContext(member);
    const mapText = (value) => replaceEmbedPlaceholders(value, context);

    const rendered = {
        ...d,
        title: mapText(d.title ?? ""),
        url: sanitizeEmbedUrl(mapText(d.url ?? "")),
        description: mapText(d.description ?? ""),
        author: d.author
            ? {
                name: mapText(d.author.name ?? ""),
                url: sanitizeEmbedUrl(mapText(d.author.url ?? "")),
                iconURL: sanitizeEmbedUrl(mapText(d.author.iconURL ?? "")),
            }
            : null,
        footer: d.footer
            ? {
                text: mapText(d.footer.text ?? ""),
                iconURL: sanitizeEmbedUrl(mapText(d.footer.iconURL ?? "")),
            }
            : null,
        thumbnail: sanitizeEmbedUrl(mapText(d.thumbnail?.url ?? "")) ? { url: sanitizeEmbedUrl(mapText(d.thumbnail?.url ?? "")) } : null,
        image: sanitizeEmbedUrl(mapText(d.image?.url ?? "")) ? { url: sanitizeEmbedUrl(mapText(d.image?.url ?? "")) } : null,
        fields: Array.isArray(d.fields)
            ? d.fields.map((f) => ({
                name: mapText(f?.name ?? ""),
                value: mapText(f?.value ?? ""),
                inline: Boolean(f?.inline),
            }))
            : [],
    };

    // If a timestamp is configured on the template, use the current (join) time for welcome messages.
    if (d.timestamp) {
        rendered.timestamp = new Date().toISOString();
    }

    // Drop empty author/footer objects after placeholder replacement.
    if (rendered.author && !String(rendered.author.name ?? "").trim()) {
        rendered.author = null;
    }
    if (rendered.footer && !String(rendered.footer.text ?? "").trim() && !rendered.footer.iconURL) {
        rendered.footer = null;
    }

    return rendered;
}

export {
    LIMITS,
    normalizeEmbedData,
    getEmbedTotalLength,
    validateEmbedData,
    hasAnyContent,
    createPreview,
    createDefaultEmbedData,
    renderWelcomeEmbedData,
};