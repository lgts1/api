import { Request, Response } from "express"
import axios from "axios"
import logger from "../../logger"
import * as crypto from "crypto"
import { v4 } from "uuid"
import { Server, Socket } from "socket.io"
import moment from "moment"

import "dotenv/config"

//IMPORT FUNCTIONS
import { emitirEventoInterno, adicionarListener } from "../../serverEvents"
import allfunctions from "../../functions/allfunctions"
import apicontroller from "../apicontroller"
import bikiniparadisefunctions from "../../functions/bikini-paradise/bikiniparadisefunctions"
//IMPORT LINHAS
import linhaperdabikini from "../../jsons/bikini-paradise/linhaperdabikini"
import linhaganhobikini from "../../jsons/bikini-paradise/linhaganhobikini"
import linhabonusbikini from "../../jsons/bikini-paradise/linhabonusbikini"
import notcashbikini from "../../jsons/bikini-paradise/notcashbikini"

export default {
   async getparadise(req: Request, res: Response) {
      try {
         const token = req.body.atk
         const user = await bikiniparadisefunctions.getuserbyatk(token)

         const jsonformatado = await JSON.parse('{"dt":{"si":{"wp":null,"lw":null,"orl":null,"wm":0,"rwm":null,"wabm":0.0,"fs":null,"sc":0,"wppr":[[],[],[0,1,2,3],[],[]],"gwt":0,"fb":null,"ctw":0.0,"pmt":null,"cwc":0,"fstc":null,"pcwc":0,"rwsp":null,"hashr":null,"ml":2,"cs":0.3,"rl":[3,8,4,12,9,1,10,5,0,0,0,0,9,1,10,5,3,8,4,12],"sid":"0","psid":"0","st":1,"nst":1,"pf":0,"aw":0.00,"wid":0,"wt":"C","wk":"0_C","wbn":null,"wfg":null,"blb":0.00,"blab":0.00,"bl":100000.00,"tb":0.00,"tbb":0.00,"tw":0.00,"np":0.00,"ocr":null,"mr":null,"ge":null}},"err":null}')

         res.send({
            dt: {
               fb: { is: true, bm: 100, t: 0.75 },
               wt: { mw: 5, bw: 20, mgw: 35, smgw: 50 },
               maxwm: null,
               cs: [0.02, 0.12, 0.8],
               ml: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
               mxl: 25,
               bl: user[0].saldo,
               inwe: false,
               iuwe: false,
               ls: jsonformatado.dt,
               cc: "BRL",
            },
            err: null,
         })
      } catch (error) {
         logger.error(error)
      }
   },
   async spin(req: Request, res: Response) {
      let cs: number = req.body.cs
      let ml: number = req.body.ml
      const token = req.body.atk

      async function lwchange(json1: { [key: string]: any }, json2: { [key: string]: any }, cs: number, ml: number) {
         for (let chave in json1) {
            if (json1.hasOwnProperty(chave)) {
               const valor = json1[chave]
               const ganho = cs * ml * parseFloat(valor)

               for (let chave2 in json2) {
                  if (json2.hasOwnProperty(chave2)) {
                     json2[chave] = ganho
                  }
               }
            }
         }
      }

      async function countrwsp(json: { [key: string]: any }) {
         let multplicador: number = 0
         for (let i = 1; i <= 25; i++) {
            const chave = i.toString()
            if (json.hasOwnProperty(chave)) {
               multplicador = multplicador + parseFloat(json[chave])
            }
         }
         return multplicador
      }
      async function gerarNumeroUnico() {
         return crypto.randomBytes(8).toString("hex")
      }
      async function returnrwm(json: { [key: string]: any }) {
         let value: number = 0
         for (let chave in json) {
            if (json.hasOwnProperty(chave)) {
               value = value + parseFloat(json[chave])
            }
         }
         return value
      }
      try {
         const user = await bikiniparadisefunctions.getuserbyatk(token)
         let bet: number = cs * ml * 25
         console.log(bet)
         let saldoatual: number = user[0].saldo
         const gamename = "bikini-paradise"

         emitirEventoInterno("att", {
            token: token,
            username: user[0].username,
            bet: bet,
            saldo: saldoatual,
            rtp: user[0].rtp,
            agentid: user[0].agentid,
            gamecode: gamename,
         })

         const agent = await allfunctions.getagentbyid(user[0].agentid)

         const checkuserbalance = await axios({
            maxBodyLength: Infinity,
            method: "POST",
            url: `${agent[0].callbackurl}gold_api/user_balance`,
            headers: {
               "Content-Type": "application/json",
            },
            data: {
               user_code: user[0].username,
            },
         })

         if (checkuserbalance.data.msg === "INVALID_USER") {
            res.send(await notcashbikini.notcash(saldoatual, cs, ml))
            return false
         } else if (checkuserbalance.data.msg === "INSUFFICIENT_USER_FUNDS") {
            res.send(await notcashbikini.notcash(saldoatual, cs, ml))
            return false
         }

         const retornado = user[0].valorganho
         const valorapostado = user[0].valorapostado

         const rtp = (retornado / valorapostado) * 100

         console.log("RTP ATUAL " + rtp)

         console.log("BET ATUAL " + bet)

         if (saldoatual < bet) {
            const semsaldo = await notcashbikini.notcash(saldoatual, cs, ml)
            res.send(semsaldo)
            return false
         }

         const resultadospin = await allfunctions.calcularganho(bet, saldoatual, token, gamename)

         if (resultadospin.result === "perda") {
            let newbalance = saldoatual - bet
            await bikiniparadisefunctions.attsaldobyatk(token, newbalance)
            await bikiniparadisefunctions.atualizardebitado(token, bet)
            await bikiniparadisefunctions.atualizarapostado(token, bet)
            const perdajson = await linhaperdabikini.linhaperda()

            let json: any = {
               dt: {
                  si: {
                     wp: null,
                     lw: null,
                     orl: null,
                     wm: perdajson.wm,
                     rwm: perdajson.rwm,
                     wabm: 0.0,
                     fs: null,
                     sc: perdajson.sc,
                     wppr: perdajson.wppr,
                     gwt: -1,
                     fb: null,
                     ctw: 0.0,
                     pmt: null,
                     cwc: 0,
                     fstc: null,
                     pcwc: 0,
                     rwsp: null,
                     hashr: "0:7;11;0;0;6#12;8;0;6;9#10;5;0;11;1#7;9;0;10;8#MV#15.0#MT#3#MG#0#",
                     ml: ml,
                     cs: cs,
                     rl: perdajson.rl,
                     sid: "1767252522907401728",
                     psid: "1767252522907401728",
                     st: 1,
                     nst: 1,
                     pf: 1,
                     aw: 0.0,
                     wid: 0,
                     wt: "C",
                     wk: "0_C",
                     wbn: null,
                     wfg: null,
                     blb: saldoatual,
                     blab: newbalance,
                     bl: newbalance,
                     tb: bet,
                     tbb: bet,
                     tw: 0.0,
                     np: -bet,
                     ocr: null,
                     mr: null,
                     ge: [3, 11],
                  },
               },
               err: null,
            }
            await bikiniparadisefunctions.savejsonspin(user[0].id, JSON.stringify(json))
            const txnid = v4()
            const dataFormatada: string = moment().toISOString()
            await apicontroller.callbackgame({
               agent_code: agent[0].agentcode,
               agent_secret: agent[0].secretKey,
               user_code: user[0].username,
               user_balance: user[0].saldo,
               user_total_credit: user[0].valorganho,
               user_total_debit: user[0].valorapostado,
               game_type: "slot",
               slot: {
                  provider_code: "PGSOFT",
                  game_code: gamename,
                  round_id: await gerarNumeroUnico(),
                  type: "BASE",
                  bet: bet,
                  win: 0,
                  txn_id: `${txnid}`,
                  txn_type: "debit_credit",
                  is_buy: false,
                  is_call: false,
                  user_before_balance: user[0].saldo,
                  user_after_balance: newbalance,
                  agent_before_balance: 100,
                  agent_after_balance: 100,
                  created_at: dataFormatada,
               },
            })
            res.send(json)
         }
         if (resultadospin.result === "ganho") {
            const ganhojson = await linhaganhobikini.linhaganho(bet)
            const multplicador = await countrwsp(ganhojson.rwsp)
            await lwchange(ganhojson.rwsp, ganhojson.lw, cs, ml)
            let valorganho = cs * ml * multplicador
            let wmvalue: number = 0

            console.log("VALOR GANHO " + valorganho)
            if (ganhojson.rwm != null) {
               wmvalue = await returnrwm(ganhojson.rwm)
               valorganho = valorganho * wmvalue
            }

            const newbalance = saldoatual + valorganho - bet
            await bikiniparadisefunctions.attsaldobyatk(token, newbalance)
            await bikiniparadisefunctions.atualizardebitado(token, bet)
            await bikiniparadisefunctions.atualizarapostado(token, bet)
            await bikiniparadisefunctions.atualizarganho(token, valorganho)

            let json: any = {
               dt: {
                  si: {
                     wp: ganhojson.wp,
                     lw: ganhojson.lw,
                     orl: null,
                     wm: wmvalue,
                     rwm: ganhojson.rwm,
                     wabm: valorganho,
                     fs: null,
                     sc: ganhojson.sc,
                     wppr: ganhojson.wppr,
                     gwt: -1,
                     fb: null,
                     ctw: valorganho,
                     pmt: null,
                     cwc: 1,
                     fstc: null,
                     pcwc: 1,
                     rwsp: ganhojson.rwsp,
                     hashr: "0:0;11;11;12;7#0;12;7;11;6#5;8;8;5;9#10;10;5;4;1#R#11#001020#MV#15.0#MT#1#R#8#011222#MV#15.0#MT#1#R#11#011020#MV#15.0#MT#1#MG#9.0#",
                     ml: ml,
                     cs: cs,
                     rl: ganhojson.rl,
                     sid: "1767263948430573056",
                     psid: "1767263948430573056",
                     st: 1,
                     nst: 1,
                     pf: 1,
                     aw: valorganho,
                     wid: 0,
                     wt: "C",
                     wk: "0_C",
                     wbn: null,
                     wfg: null,
                     blb: saldoatual,
                     blab: newbalance,
                     bl: newbalance,
                     tb: bet,
                     tbb: bet,
                     tw: valorganho,
                     np: -bet,
                     ocr: null,
                     mr: null,
                     ge: [1, 11],
                  },
               },
               err: null,
            }

            await bikiniparadisefunctions.savejsonspin(user[0].id, JSON.stringify(json))

            const txnid = v4()
            const dataFormatada: string = moment().toISOString()

            await apicontroller.callbackgame({
               agent_code: agent[0].agentcode,
               agent_secret: agent[0].secretKey,
               user_code: user[0].username,
               user_balance: user[0].saldo,
               user_total_credit: user[0].valorganho,
               user_total_debit: user[0].valorapostado,
               game_type: "slot",
               slot: {
                  provider_code: "PGSOFT",
                  game_code: gamename,
                  round_id: await gerarNumeroUnico(),
                  type: "BASE",
                  bet: bet,
                  win: Number(valorganho),
                  txn_id: `${txnid}`,
                  txn_type: "debit_credit",
                  is_buy: false,
                  is_call: false,
                  user_before_balance: user[0].saldo,
                  user_after_balance: newbalance,
                  agent_before_balance: 100,
                  agent_after_balance: 100,
                  created_at: dataFormatada,
               },
            })
            res.send(json)
         }
         if (resultadospin.result === "bonus" && resultadospin.gamecode === "bikini-paradise") {
            const bonusjson = await linhabonusbikini.linhabonus(resultadospin.json)
            let call = await allfunctions.getcallbyid(resultadospin.idcall)

            if (call[0].steps === null && call[0].status === "pending") {
               if (saldoatual < bet) {
                  const semsaldo = await notcashbikini.notcash(saldoatual, cs, ml)
                  res.send(semsaldo)
                  return false
               }
            }

            if (call[0].steps === null && call[0].status === "pending") {
               const steps = Object.keys(bonusjson).length - 1
               await allfunctions.updatestepscall(resultadospin.idcall, steps)
            }

            let calltwo = await allfunctions.getcallbyid(resultadospin.idcall)

            if (calltwo[0].steps === 0) {
               await allfunctions.completecall(calltwo[0].id)
            }

            let multplicador = 0

            if (bonusjson[calltwo[0].steps].rwsp != null) {
               multplicador = await countrwsp(bonusjson[calltwo[0].steps].rwsp)
            }
            if (bonusjson[calltwo[0].steps].lw != null) {
               await lwchange(bonusjson[calltwo[0].steps].rwsp, bonusjson[calltwo[0].steps].lw, cs, ml)
            }
            let wmvalue = 0

            const txnid = v4()
            const dataFormatada: string = moment().toISOString()

            let valorganho = cs * ml * multplicador
            let valorganhonowm = cs * ml * multplicador

            if (bonusjson[calltwo[0].steps].rwm != null) {
               wmvalue = await returnrwm(bonusjson[calltwo[0].steps].rwm)
               valorganho = valorganho * wmvalue
            }

            let newbalance = 0

            if (calltwo[0].steps === Object.keys(bonusjson).length - 1) {
               newbalance = saldoatual - bet + valorganho
               await bikiniparadisefunctions.attsaldobyatk(token, newbalance)

               await apicontroller.callbackgame({
                  agent_code: agent[0].agentcode,
                  agent_secret: agent[0].secretKey,
                  user_code: user[0].username,
                  user_balance: user[0].saldo,
                  user_total_credit: user[0].valorganho,
                  user_total_debit: user[0].valorapostado,
                  game_type: "slot",
                  slot: {
                     provider_code: "PGSOFT",
                     game_code: gamename,
                     round_id: await gerarNumeroUnico(),
                     type: "BASE",
                     bet: bet,
                     win: valorganho,
                     txn_id: `${txnid}`,
                     txn_type: "debit_credit",
                     is_buy: false,
                     is_call: false,
                     user_before_balance: user[0].saldo,
                     user_after_balance: newbalance,
                     agent_before_balance: 100,
                     agent_after_balance: 100,
                     created_at: dataFormatada,
                  },
               })
            }

            newbalance = saldoatual + valorganho

            if (calltwo[0].steps === 0) {
               newbalance = saldoatual + valorganho - bet
            }

            await bikiniparadisefunctions.attawcall(calltwo[0].id, valorganho)

            await bikiniparadisefunctions.attsaldobyatk(token, newbalance)
            await bikiniparadisefunctions.atualizardebitado(token, bet)
            await bikiniparadisefunctions.atualizarapostado(token, bet)

            if (calltwo[0].steps > 0) {
               await allfunctions.subtrairstepscall(resultadospin.idcall)
            }
            if (bonusjson[calltwo[0].steps].fs.hasOwnProperty("aw")) {
               bonusjson[calltwo[0].steps].fs["aw"] = (await allfunctions.getcallbyid(resultadospin.idcall))[0].aw
            }

            let json: any = {
               dt: {
                  si: {
                     wp: bonusjson[calltwo[0].steps].wp,
                     lw: bonusjson[calltwo[0].steps].lw,
                     orl: bonusjson[calltwo[0].steps].orl,
                     wm: wmvalue,
                     rwm: bonusjson[calltwo[0].steps].rwm,
                     wabm: valorganhonowm,
                     fs: bonusjson[calltwo[0].steps].fs,
                     sc: bonusjson[calltwo[0].steps].sc,
                     wppr: bonusjson[calltwo[0].steps].wppr,
                     gwt: -1,
                     fb: null,
                     ctw: valorganho,
                     pmt: null,
                     cwc: 0,
                     fstc: null,
                     pcwc: 0,
                     rwsp: bonusjson[calltwo[0].steps].rwsp,
                     hashr: "0:1;1;9;7;7#11;11;5;5;9#9;8;3;1;4#7;6;1;9;11#MV#15.0#MT#1#MG#0#",
                     ml: ml,
                     cs: cs,
                     rl: bonusjson[calltwo[0].steps].rl,
                     sid: "1767591680813235712",
                     psid: "1767591680813235712",
                     st: bonusjson[calltwo[0].steps].st,
                     nst: bonusjson[calltwo[0].steps].nst,
                     pf: 1,
                     aw: (await allfunctions.getcallbyid(resultadospin.idcall))[0].aw,
                     wid: 0,
                     wt: "C",
                     wk: "0_C",
                     wbn: null,
                     wfg: null,
                     blb: saldoatual,
                     blab: newbalance,
                     bl: newbalance,
                     tb: bet,
                     tbb: bet,
                     tw: valorganho,
                     np: -valorganho,
                     ocr: null,
                     mr: null,
                     ge: [2, 1, 11],
                  },
               },
               err: null,
            }

            await apicontroller.callbackgame({
               agent_code: agent[0].agentcode,
               agent_secret: agent[0].secretKey,
               user_code: user[0].username,
               user_balance: user[0].saldo,
               user_total_credit: user[0].valorganho,
               user_total_debit: user[0].valorapostado,
               game_type: "slot",
               slot: {
                  provider_code: "PGSOFT",
                  game_code: gamename,
                  round_id: await gerarNumeroUnico(),
                  type: "BASE",
                  bet: 0,
                  win: Number(valorganho),
                  txn_id: `${txnid}`,
                  txn_type: "debit_credit",
                  is_buy: false,
                  is_call: true,
                  user_before_balance: user[0].saldo,
                  user_after_balance: newbalance,
                  agent_before_balance: 100,
                  agent_after_balance: 100,
                  created_at: dataFormatada,
               },
            })
            await bikiniparadisefunctions.savejsonspin(user[0].id, JSON.stringify(json))

            res.send(json)
         }
      } catch (error) {
         logger.error(error)
      }
   },
}
